/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint no-constant-condition: ["error", { "checkLoops": false }] */
import OSS from 'ali-oss';
import axios from 'axios';
import path from 'path';
import _ from 'lodash';
import {
  GetFunctionRequest,
  GetFunctionResponse,
  ListFunctionVersionsRequest,
  ListTriggersRequest,
  GetAsyncInvokeConfigRequest,
  ListInstancesRequest,
  ListAsyncInvokeConfigsRequest,
  TagResourcesRequest,
  UntagResourcesRequest,
  CreateSessionRequest,
  CreateSessionInput,
  NASConfig,
  NASMountConfig,
  DeleteSessionRequest,
  GetSessionRequest,
  ListSessionsRequest,
  UpdateSessionRequest,
  UpdateSessionInput,
  ChangeResourceGroupRequest,
  ChangeResourceGroupInput,
} from '@alicloud/fc20230330';
import { RuntimeOptions } from '@alicloud/tea-util';

import logger from '../../logger';
import { sleep, removeNullValues, isAppCenter } from '../../utils/index';
import {
  FC_DEPLOY_RETRY_COUNT,
  FC_INSTANCE_EXEC_TIMEOUT,
  FC_CONTAINER_ACCELERATED_TIMEOUT,
} from '../../default/config';

import FC_Client, { fc2Client } from './impl/client';
import {
  IFunction,
  ILogConfig,
  ITrigger,
  convertIHttpTriggerConfig,
  instanceOfIHttpTriggerConfig,
  validateIHttpTriggerConfig,
} from '../../interface';
import {
  FC_API_ERROR_CODE,
  isAccessDenied,
  isSlsNotExistException,
  isInvalidArgument,
  isFailedState,
  isFunctionStateWaitTimedOut,
} from './error-code';
import { isCustomContainerRuntime, isCustomRuntime, computeLocalAuto } from './impl/utils';
import replaceFunctionConfig from './impl/replace-function-config';
import { IAlias } from '../../interface/cli-config/alias';
import { TriggerType } from '../../interface/base';

export enum GetApiType {
  original = 'original', // 直接返回接口返回值
  simple = 'simple', // 返回数据时删除空配置
  simpleUnsupported = 'simple-unsupported', // 返回数据时删除：空配置、系统字段
}

const UNSUPPORTED_UPDATE_TRIGGER_LIST = ['mns_topic', 'tablestore'];

export default class FC extends FC_Client {
  static computeLocalAuto = computeLocalAuto;
  static isCustomContainerRuntime = isCustomContainerRuntime;
  static isCustomRuntime = isCustomRuntime;
  static replaceFunctionConfig = replaceFunctionConfig;

  async untilFunctionStateOK(config: IFunction, reason: string) {
    const retryInterval = 2;
    const startTime = new Date().getTime();
    const calculateRetryTime = (minute: number) =>
      new Date().getTime() - startTime > minute * 60 * 1000;

    // 默认重试 3 min
    const maxRetryContainerAcceleratedTime = FC_CONTAINER_ACCELERATED_TIMEOUT;

    const retryContainerAccelerated = FC.isCustomContainerRuntime(config.runtime);
    // 部署镜像需要重试 3min, 直到达到!(State == Pending || LastUpdateStatus == InProgress)
    if (retryContainerAccelerated) {
      console.log('');
      if (reason === 'CREATE') {
        if (isAppCenter()) {
          logger.info(
            `${config.customContainerConfig.image} optimization to be ready, the function will be available for invocation once this process is complete`,
          );
        } else {
          logger.spin(
            'checking',
            `${config.customContainerConfig.image} `,
            `optimization to be ready, the function will be available for invocation once this process is complete ...`,
          );
        }
      } else if (reason === 'UPDATE') {
        if (isAppCenter()) {
          logger.info(
            `${config.customContainerConfig.image} optimization to be ready, function calls will be updated to the latest deployed version once the image optimization process is complete ...`,
          );
        } else {
          logger.spin(
            'checking',
            `${config.customContainerConfig.image}`,
            `optimization to be ready, function calls will be updated to the latest deployed version once the image optimization process is complete ...`,
          );
        }
      }
      let failedTimes = 0; // 初始化失败次数
      while (true) {
        const functionMeta = await this.getFunction(
          config.functionName,
          GetApiType.simpleUnsupported,
        );
        const state = _.get(functionMeta, 'state');
        const lastUpdateStatus = _.get(functionMeta, 'lastUpdateStatus');
        logger.debug(
          `untilFunctionStateOK ==>  function State=${state},  LastUpdateStatus=${lastUpdateStatus}`,
        );
        if (state === 'Pending' || lastUpdateStatus === 'InProgress') {
          if (calculateRetryTime(maxRetryContainerAcceleratedTime)) {
            throw new Error(
              `retry to wait function state ok timeout, function State=${state},  LastUpdateStatus=${lastUpdateStatus}`,
            );
          }
          await sleep(retryInterval);
          if (isAppCenter()) {
            logger.info(
              `${
                config.customContainerConfig.image
              } optimization is not ready, function state=${state}, lastUpdateStatus=${lastUpdateStatus}, waiting ${
                (new Date().getTime() - startTime) / 1000
              } seconds...`,
            );
          } else {
            logger.spin(
              'checking',
              `${config.customContainerConfig.image}`,
              `optimization is not ready, function state=${state}, lastUpdateStatus=${lastUpdateStatus}, waiting ${
                (new Date().getTime() - startTime) / 1000
              } seconds...`,
            );
          }
        } else if (state === 'Failed') {
          failedTimes++;
          if (failedTimes < 3) {
            logger.debug(`retry to wait function state ok failed but not reach 3 times.`);
          } else {
            throw new Error(
              `retry to wait function state ok failed reach 3 times, function State=${state},  LastUpdateStatus=${lastUpdateStatus}`,
            );
          }
          await sleep(retryInterval);
        } else {
          if (isAppCenter()) {
            logger.info(`${config.customContainerConfig.image} optimization is ready`);
          } else {
            logger.spin(
              'checked',
              `${config.customContainerConfig.image}`,
              `optimization is ready`,
            );
          }
          break;
        }
      }
    }
  }

  /**
   * 创建或者修改函数
   */
  async deployFunction(config: IFunction, { slsAuto, type }): Promise<void> {
    logger.debug(`Deploy function use config:\n${JSON.stringify(config, null, 2)}`);
    let needUpdate = false;
    let remoteConfig = null;
    try {
      remoteConfig = await this.getFunction(config.functionName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug(
          `Checking function ${config.functionName} error: ${err.message}, retrying create`,
        );
      }
    }

    let retry = 0;
    let retryInterval = 3;

    // 计算是否超时
    const startTime = new Date().getTime();
    const calculateRetryTime = (minute: number) =>
      new Date().getTime() - startTime > minute * 60 * 1000;

    if (config?.tags) {
      config.tags = this.tagsToLowerCase(config?.tags);
      this.checkTags(config?.tags);
    }

    while (true) {
      try {
        if (!needUpdate) {
          logger.debug(`Need create function ${config.functionName}`);
          try {
            await this.createFunction(config);
            await this.untilFunctionStateOK(config, 'CREATE');
            return;
          } catch (ex) {
            logger.debug(`Create function error: ${ex.message}`);
            if (ex.code !== FC_API_ERROR_CODE.FunctionAlreadyExists) {
              throw ex;
            }
            logger.debug('Create functions already exists, retry update');
            needUpdate = true;
          }
        }

        if (config?.customRuntimeConfig) {
          config.customRuntimeConfig = _.defaults(config.customRuntimeConfig, {
            command: [],
            args: [],
          });
        }
        if (config?.customContainerConfig) {
          config.customContainerConfig = _.defaults(config.customContainerConfig, {
            command: [],
            entrypoint: [],
          });
        }

        /*
         * 如果tags有更新，则需要更新tags
         * 判断tags的长度是否相等，如果不相等，则需要更新tags
         * 如果tags的长度相等，则比较tags的值是否相等，如果不相等，则需要更新tags
         */
        const remoteTags = remoteConfig?.body?.tags;
        const localTags = config.tags;
        if (this.isUpdateTags(remoteTags, localTags)) {
          logger.debug(`Updating tags for function ${config.functionName}`);
          /*
           * 先 diff 获取需要删除的 tags 和需要添加的 tags
           */
          const { deleteTags, addTags } = this.diffTags(remoteTags, localTags);
          // logger.info(`deleteTags: ${JSON.stringify(deleteTags,null,2)}, addTags: ${JSON.stringify(addTags,null,2)}`);

          if (deleteTags?.length) {
            const untagResourcesRequest = new UntagResourcesRequest({
              resourceId: [remoteConfig?.body?.functionArn],
              resourceType: 'function',
              tagKey: deleteTags,
            });
            await this.fc20230330Client.untagResources(untagResourcesRequest);
          }

          if (addTags?.length) {
            const tagResourcesRequest = new TagResourcesRequest({
              body: {
                resourceId: [remoteConfig?.body?.functionArn],
                resourceType: 'FUNCTION',
                tag: addTags,
              },
            });
            await this.fc20230330Client.tagResources(tagResourcesRequest);
          }
        }

        logger.debug(`Need update function ${config.functionName}`);
        if (type === 'code') {
          // eslint-disable-next-line no-param-reassign
          config = {
            functionName: config.functionName,
            code: config.code,
            customContainerConfig: config.customContainerConfig,
          } as any;
        } else if (type === 'config') {
          _.unset(config, 'code');
          _.unset(config, 'customContainerConfig');
        }
        await this.updateFunction(config);
        await this.untilFunctionStateOK(config, 'UPDATE');
        if (config.resourceGroupId) {
          const remoteResourceGroupId = remoteConfig?.body?.resourceGroupId;
          if (remoteResourceGroupId !== config.resourceGroupId) {
            logger.info(`Updating resource group for function ${config.functionName}`);
            await this.changeFunctionResourceGroup(config.functionName, config.resourceGroupId);
          }
        }
        return;
      } catch (ex) {
        logger.debug(`Deploy function error: ${ex}`);
        /**
         * 重试机制
          ○ 1. 如果是权限问题，或3次都是 Failed 不重试直接异常
          ○ 2. 重试 3min, 首次创建日志：报错日志不存在，需要重试 3min
          ○ 3. 其他情况，默认重试 3 次
        */
        const { project, logstore } = (config.logConfig || {}) as ILogConfig;
        const retrySls = slsAuto && isSlsNotExistException(project, logstore, ex);
        if (retrySls) {
          if (calculateRetryTime(3)) {
            throw ex;
          }
          retryInterval = 5;
        } else if (
          isAccessDenied(ex) ||
          isInvalidArgument(ex) ||
          isFailedState(ex) ||
          isFunctionStateWaitTimedOut(ex)
        ) {
          throw ex;
        } else if (retry > FC_DEPLOY_RETRY_COUNT) {
          throw ex;
        }
        retry += 1;
        if (isAppCenter()) {
          const action = needUpdate ? 'update' : 'create';
          logger.info(
            `retrying ${action} function ${this.region}/${config.functionName} ${retry} times`,
          );
        } else {
          logger.spin(
            'retrying',
            'function',
            needUpdate ? 'update' : 'create',
            `${this.region}/${config.functionName}`,
            retry,
          );
        }
        await sleep(retryInterval);
      }
    }
  }

  /**
   * 创建或者修改触发器
   */
  async deployTrigger(functionName: string, config: ITrigger): Promise<void> {
    logger.debug(`Deploy trigger use config(${functionName}): ${JSON.stringify(config)}`);

    let needUpdate = false;
    const { triggerName } = config;
    const id = `${functionName}/${triggerName}`;
    try {
      await this.getTrigger(functionName, triggerName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug(`Checking trigger ${id} error: ${err.message}, retrying create.`);
      }
    }

    if (config.triggerConfig && instanceOfIHttpTriggerConfig(config.triggerConfig)) {
      config.triggerConfig = convertIHttpTriggerConfig(config.triggerConfig);
      if (!validateIHttpTriggerConfig(config.triggerConfig)) {
        return;
      }
    }

    let retry = 0;
    logger.debug(`Deploy ${functionName} trigger:\n${JSON.stringify(config, null, 2)}`);
    // eslint-disable-next-line no-param-reassign
    config.triggerConfig = JSON.stringify(config.triggerConfig);

    while (true) {
      try {
        if (!needUpdate) {
          logger.debug(`Need create trigger ${id}`);
          try {
            await this.createTrigger(functionName, config);
            return;
          } catch (ex) {
            logger.debug(`Create trigger error: ${ex.message}`);
            if (ex.code !== FC_API_ERROR_CODE.TriggerAlreadyExists) {
              throw ex;
            }
            logger.debug('Create trigger already exists, retry update');
            needUpdate = true;
          }
        }

        logger.debug(`Need update trigger ${id}`);
        const { triggerType } = config;
        if (UNSUPPORTED_UPDATE_TRIGGER_LIST.includes(triggerType)) {
          logger.warn(`${id} ${triggerType} trigger is no need update!`);
        } else {
          await this.updateTrigger(functionName, triggerName, config);
        }
        return;
      } catch (ex) {
        logger.debug(`Deploy trigger error: ${ex}`);

        // TODO: 如果是权限问题不重试直接异常
        if (isAccessDenied(ex) || isInvalidArgument(ex)) {
          throw ex;
        } else if (retry > FC_DEPLOY_RETRY_COUNT) {
          throw ex;
        }
        retry += 1;
        if (isAppCenter()) {
          const action = needUpdate ? 'update' : 'create';
          logger.info(`retrying ${action} trigger ${this.region}/${id} ${retry} times`);
        } else {
          logger.spin(
            'retrying',
            'trigger',
            needUpdate ? 'update' : 'create',
            `${this.region}/${id}`,
            retry,
          );
        }

        await sleep(3);
      }
    }
  }

  /**
   * 上传代码包到临时 oss
   */
  async uploadCodeToTmpOss(
    zipFile: string,
  ): Promise<{ ossBucketName: string; ossObjectName: string }> {
    const client = fc2Client(this.region, this.credentials, this.customEndpoint);

    const {
      data: { credentials, ossBucket, objectName },
    } = await (client as any).getTempBucketToken();

    let ossEndpoint = 'https://oss-accelerate.aliyuncs.com';
    if (process.env.FC_REGION === this.region) {
      ossEndpoint = `oss-${this.region}-internal.aliyuncs.com`;
    }
    if (this.customEndpoint) {
      ossEndpoint = `oss-${this.region}.aliyuncs.com`;
    }
    if (this.region === 'cn-shanghai-finance-1') {
      if (process.env.FC_REGION === this.region) {
        ossEndpoint = `oss-${this.region}-pub-internal.aliyuncs.com`;
      } else {
        ossEndpoint = `oss-${this.region}-pub.aliyuncs.com`;
      }
    }
    if (this.region === 'cn-heyuan-acdr-1') {
      ossEndpoint = `oss-${this.region}-internal.aliyuncs.com`;
    }
    if (process.env.FC_CODE_TEMP_OSS_ENDPOINT) {
      ossEndpoint = process.env.FC_CODE_TEMP_OSS_ENDPOINT;
    }
    logger.debug(`Uploading code to ${ossEndpoint}`);

    const ossClient = new OSS({
      // region: ossRegion,
      endpoint: ossEndpoint,
      accessKeyId: credentials.AccessKeyId,
      accessKeySecret: credentials.AccessKeySecret,
      stsToken: credentials.SecurityToken,
      bucket: ossBucket,
      timeout: '600000', // 10min
      refreshSTSToken: async () => {
        const refreshToken = await axios.get('https://127.0.0.1/sts');
        return {
          accessKeyId: refreshToken.data.credentials.AccessKeyId,
          accessKeySecret: refreshToken.data.credentials.AccessKeySecret,
          stsToken: refreshToken.data.credentials.SecurityToken,
        };
      },
    });
    const ossObjectName = `${client.accountid}/${objectName}`;
    await (ossClient as any).put(ossObjectName, path.normalize(zipFile));

    const config = { ossBucketName: ossBucket, ossObjectName };
    logger.debug(`tempCodeBucketToken response: ${JSON.stringify(config)}`);
    return config;
  }

  /**
   * 获取函数
   */
  async getFunction(
    functionName: string,
    type: `${GetApiType}` = GetApiType.original,
    qualifier?: string,
  ): Promise<GetFunctionResponse | Record<string, any>> {
    const getFunctionRequest = new GetFunctionRequest({ qualifier });
    const result = await this.fc20230330Client.getFunction(functionName, getFunctionRequest);
    logger.debug(`Get function ${functionName} response:`);
    logger.debug(result);

    if (type === GetApiType.original) {
      return result;
    }

    const { body } = result.toMap();
    logger.debug(`Get function ${functionName} body: ${JSON.stringify(body)}`);

    if (_.isEmpty(body.nasConfig?.mountPoints)) {
      _.unset(body, 'nasConfig');
    }

    if (!body.vpcConfig?.vpcId) {
      _.unset(body, 'vpcConfig');
    }

    if (!body.logConfig?.project) {
      _.unset(body, 'logConfig');
    }

    if (_.isEmpty(body.ossMountConfig?.mountPoints)) {
      _.unset(body, 'ossMountConfig');
    }

    if (_.isEmpty(body.polarFsConfig?.mountPoints)) {
      _.unset(body, 'polarFsConfig');
    }

    if (_.isEmpty(body.tracingConfig)) {
      _.unset(body, 'tracingConfig');
    }

    if (_.isEmpty(body.environmentVariables)) {
      _.unset(body, 'environmentVariables');
    }

    if (_.isEmpty(body.customRuntimeConfig?.command)) {
      _.unset(body.customRuntimeConfig, 'command');
    }

    if (_.isEmpty(body.customRuntimeConfig?.args)) {
      _.unset(body.customRuntimeConfig, 'args');
    }

    if (_.isEmpty(body.customContainerConfig?.command)) {
      _.unset(body.customContainerConfig, 'command');
    }

    if (_.isEmpty(body.customContainerConfig?.entrypoint)) {
      _.unset(body.customContainerConfig, 'entrypoint');
    }

    if (body.sessionAffinityConfig) {
      body.sessionAffinityConfig = JSON.parse(body.sessionAffinityConfig);
    }

    if (body.layers) {
      logger.debug(body.layers);
      const newLayers = [];
      for (let i = 0; i < body.layers.length; i++) {
        const l = body.layers[i];
        newLayers.push(l.arn);
      }
      // eslint-disable-next-line no-param-reassign
      body.layers = newLayers;
    }

    if (type === GetApiType.simpleUnsupported) {
      const r = _.omit(body, [
        'lastModifiedTime',
        'functionId',
        'createdTime',
        'codeSize',
        'codeChecksum',
        'useSLRAuthentication',
      ]);
      logger.debug(`Result body: ${JSON.stringify(r)}`);
      return r;
    }

    logger.debug(`Result body: ${JSON.stringify(body)}`);
    return body;
  }

  /**
   * 获取触发器配置
   */
  async getTrigger(
    functionName: string,
    triggerName: string,
    type: `${GetApiType}` = GetApiType.original,
  ): Promise<any> {
    const runtime = new RuntimeOptions({});
    const headers: { [key: string]: string } = {};
    const result = await this.fc20230330Client.getTriggerWithOptions(
      functionName,
      triggerName,
      headers,
      runtime,
    );
    if (type === GetApiType.original) {
      return result;
    }
    // eslint-disable-next-line prefer-const
    let { body } = result.toMap();
    body.triggerConfig = JSON.parse(body.triggerConfig);

    if (type === GetApiType.simpleUnsupported) {
      let r = _.omit(body, ['createdTime', 'httpTrigger', 'lastModifiedTime', 'triggerId']);
      // triggerConfig 可能会返回 key 为 null 的值， 比如 SLS 触发器
      removeNullValues(r);
      // eb 触发器去掉 invocationRole, sourceArn 和 status
      if (r.triggerType === TriggerType.eventbridge) {
        r = _.omit(r, ['invocationRole', 'sourceArn', 'status']);
      }
      logger.debug(`getTrigger simpleUnsupported Result body: ${JSON.stringify(r)}`);
      return r;
    }

    // eb 触发器去掉 eventSourceConfig.eventSourceParameters 中的其他无关的 null sourceParameters
    if (body.triggerType === TriggerType.eventbridge) {
      removeNullValues(body.triggerConfig.eventSourceConfig.eventSourceParameters);
    }
    logger.debug(`getTrigger simple Result body: ${JSON.stringify(body)}`);
    return body;
  }

  /**
   * 获取最新的 version 版本
   * @param functionName
   * @returns
   */
  async getVersionLatest(functionName: string) {
    const request = new ListFunctionVersionsRequest({ limit: 1 });
    const runtime = new RuntimeOptions({});
    const headers = {};
    const result = await this.fc20230330Client.listFunctionVersionsWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
    const { body } = result.toMap();
    return _.get(body, 'versions[0]', {});
  }

  /**
   * 发布别名
   */
  async publishAlias(functionName: string, aliasName: string, config: IAlias) {
    let needUpdate = false;
    try {
      await this.getAlias(functionName, aliasName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.AliasNotFound) {
        logger.debug(
          `Checking function ${functionName} alias ${aliasName} error: ${err.message}, retrying create`,
        );
      }
    }

    if (!needUpdate) {
      logger.debug(`Need create alias ${functionName} alias ${aliasName}`);
      try {
        const ret = await this.createAlias(functionName, config);
        return ret.body;
      } catch (ex) {
        logger.debug(`Create function error: ${ex.message}`);
        if (ex.code !== FC_API_ERROR_CODE.AliasAlreadyExists) {
          throw ex;
        }
        logger.debug('Create functions already exists, retry update');
        needUpdate = true;
      }
    }
    const ret = await this.updateAlias(functionName, aliasName, config);
    return ret.body;
  }

  /**
   * 获取版本列表
   * @param functionName
   * @returns
   */
  async listFunctionVersion(functionName: string): Promise<any[]> {
    let nextToken: string;
    const limit = 100;
    const versions: any[] = [];

    while (true) {
      const request = new ListFunctionVersionsRequest({ limit, nextToken });
      const runtime = new RuntimeOptions({});
      const headers = {};
      const result = await this.fc20230330Client.listFunctionVersionsWithOptions(
        functionName,
        request,
        headers,
        runtime,
      );
      const { body } = result.toMap();
      versions.push(...body.versions);
      if (!body.nextToken) {
        return versions;
      }
      nextToken = body.nextToken;
    }
  }

  async listTriggers(
    functionName: string,
    disable_list_remote_eb_triggers: string,
    disable_list_remote_alb_triggers: string,
  ) {
    let nextToken: string;
    const limit = 10;
    const triggers: any[] = [];

    while (true) {
      const request = new ListTriggersRequest({ limit, nextToken });
      const runtime = new RuntimeOptions({});
      const headers = {
        'x-fc-disable-list-remote-eb-triggers': disable_list_remote_eb_triggers || 'false',
        'x-fc-disable-list-remote-alb-triggers': disable_list_remote_alb_triggers || 'false',
      };
      logger.info(`listTriggers headers: ${JSON.stringify(headers, null, 2)}`);
      const result = await this.fc20230330Client.listTriggersWithOptions(
        functionName,
        request,
        headers,
        runtime,
      );
      logger.info(`listTriggers result: ${JSON.stringify(result, null, 2)}`);
      const { body } = result.toMap();
      triggers.push(...body.triggers);
      if (!body.nextToken) {
        // eslint-disable-next-line prefer-const
        let filteredTriggers = [];
        for (let key = 0; key < triggers.length; key++) {
          const trigger = triggers[key];
          if (
            trigger.triggerType === TriggerType.eventbridge &&
            trigger.triggerName.indexOf('|') > -1
          ) {
            continue;
          }
          filteredTriggers.push(trigger);
        }
        return filteredTriggers;
      }
      nextToken = body.nextToken;
    }
  }

  /**
   * 获取异步调用配置
   */
  async getAsyncInvokeConfig(
    functionName: string,
    qualifier: string,
    type: `${GetApiType}` = GetApiType.original,
  ): Promise<any> {
    const runtime = new RuntimeOptions({});
    const headers: { [key: string]: string } = {};
    const req = new GetAsyncInvokeConfigRequest({ qualifier });
    const result = await this.fc20230330Client.getAsyncInvokeConfigWithOptions(
      functionName,
      req,
      headers,
      runtime,
    );
    if (type === GetApiType.original) {
      return result;
    }
    // eslint-disable-next-line prefer-const
    let { body } = result.toMap();
    if (type === GetApiType.simpleUnsupported) {
      // eslint-disable-next-line prefer-const
      let r = _.omit(body, ['createdTime', 'functionArn', 'lastModifiedTime']);
      if (_.isEmpty(r?.destinationConfig)) {
        _.unset(r, 'destinationConfig');
      }
      removeNullValues(r);
      logger.debug(`getAsyncInvokeConfig simpleUnsupported Result body: ${JSON.stringify(r)}`);
      return r;
    }
    logger.debug(`getAsyncInvokeConfig simple Result body: ${JSON.stringify(body)}`);
    return body;
  }

  async listAsyncInvokeConfig(functionName: string): Promise<any[]> {
    const req = new ListAsyncInvokeConfigsRequest({ functionName, limit: 100 });
    const result = await this.fc20230330Client.listAsyncInvokeConfigs(req);
    const { body } = result.toMap();
    // eslint-disable-next-line prefer-const
    let configs = [];
    for (const c of body.configs) {
      if (_.isEmpty(c.destinationConfig)) {
        continue;
      }
      configs.push(c);
    }
    return configs;
  }

  /**
   * 获取 VpcBinding
   */
  async getVpcBinding(
    functionName: string,
    type: `${GetApiType}` = GetApiType.original,
  ): Promise<any> {
    const result = await this.fc20230330Client.listVpcBindings(functionName);
    if (type === GetApiType.original) {
      return result;
    }
    const { body } = result.toMap();
    return body;
  }

  async listInstances(functionName: string, qualifier: string) {
    const result = await this.fc20230330Client.listInstances(
      functionName,
      new ListInstancesRequest({
        qualifier,
        withAllActive: true,
      }),
    );
    const { body } = result.toMap();
    logger.debug(`listInstances response  body: ${JSON.stringify(body)}`);
    return body;
  }

  async instanceExec(
    functionName: string,
    instanceId: string,
    rawData: string[],
    qualifier,
    tty = true,
  ) {
    const client = fc2Client(this.region, this.credentials, this.customEndpoint) as any;
    client.version = '2023-03-30';
    const queries = {
      FC_INSTANCE_EXEC_TIMEOUT,
      stdin: 'true',
      tty: tty ? 'true' : 'false',
      stdout: 'true',
      stderr: 'true',
      command: rawData,
      qualifier,
    };

    logger.info(
      'Enter `exit` to open the link on the server side to exit (recommended), or execute `control + ]` to force the client to exit',
    );

    // eslint-disable-next-line no-async-promise-executor
    await new Promise(async (resolve) => {
      logger.debug(`command-exec command:\n${JSON.stringify(queries, null, 2)}`);
      logger.debug('----------------------------------------');

      const messageStdout = 1;
      const messageStderr = 2;

      const onStdout = (msg) => process.stdout.write(msg.toString());
      const onStderr = (msg) => process.stderr.write(msg.toString());

      /* eslint-disable @typescript-eslint/no-unused-vars */
      const onClose = (e) => {
        process.exit(0);
      };
      /* eslint-disable @typescript-eslint/no-unused-vars */

      const onError = (e, reason) => {
        process.stderr.write(e.toString());
        process.stderr.write(reason);
        process.stdin.setRawMode(false);
        resolve(e);
      };
      const ws = client.websocket(
        `/functions/${functionName}/instances/${instanceId}/exec`,
        queries,
      );

      const ticker = setInterval(() => {
        try {
          ws.ping();
        } catch (e) {
          ws.close();
        }
      }, 5000);

      ws.on('unexpected-response', (req, incoming) => {
        let data = [];
        incoming.on('data', (chunk) => {
          data = data.concat(chunk);
        });
        incoming.on('end', () => {
          const msg = JSON.parse(data.toString());
          const err = new Error(msg.ErrorMessage);
          onError(err, 'unexpected-response end');
          ws.close();
        });
      });
      ws.on('close', (err) => {
        clearInterval(ticker);
        onClose(err);
      });
      ws.on('error', (code, reason) => onError(code, reason));
      ws.on('ping', (data) => ws.pong(data));
      ws.on('message', (message) => {
        if (!!message && message.length >= 2) {
          const messageType = message[0];
          const data = message.slice(1);
          if (messageType === messageStdout && onStdout) {
            onStdout(data);
          } else if (messageType === messageStderr && onStderr) {
            onStderr(data);
          }
        }
      });

      ws.onopen = resolve;

      const conn = {
        websocket: ws,
        close: () => ws.close(),
        sendMessage: (data) => {
          if (!(data instanceof Uint8Array)) {
            throw new Error('data must be Uint8Array');
          }
          const messageArray = new Uint8Array(data.length);
          messageArray.set(data);
          ws.send(messageArray);
        },
      };

      if (process.stdin.isPaused()) {
        logger.debug('In the running state, switch an explicitly paused stream to flow mode');
        process.stdin.resume();
      }
      process.stdin.setEncoding('ascii');
      process.stdin.setRawMode(true);
      process.stdin.on('data', (chunk: string) => {
        const arr = [];
        for (const ch of chunk) {
          // control + ] 退出
          if (ch.charCodeAt(0) === 29) {
            conn?.close();
            process.exit(0);
          }
          arr.push(ch.charCodeAt(0));
        }
        conn.sendMessage(new Uint8Array(arr));
      });
    });
  }

  async createFunctionSession(functionName: string, config: any) {
    let createSessionInput: CreateSessionInput;
    if (config.nasConfig && !_.isEmpty(config.nasConfig.mountPoints)) {
      const mountPoints = config.nasConfig.mountPoints.map(
        (mountPoint: any) =>
          new NASMountConfig({
            enableTLS: mountPoint.enableTLS,
            mountDir: mountPoint.mountDir,
            serverAddr: mountPoint.serverAddr,
          }),
      );
      const nasConfig = new NASConfig({
        groupId: config.nasConfig.groupId,
        mountPoints,
        userId: config.nasConfig.userId,
      });
      createSessionInput = new CreateSessionInput({
        sessionTTLInSeconds: config.sessionTTLInSeconds,
        sessionIdleTimeoutInSeconds: config.sessionIdleTimeoutInSeconds,
        nasConfig,
      });
    } else {
      createSessionInput = new CreateSessionInput({
        sessionTTLInSeconds: config.sessionTTLInSeconds,
        sessionIdleTimeoutInSeconds: config.sessionIdleTimeoutInSeconds,
      });
    }

    const createSessionRequest = new CreateSessionRequest({
      qualifier: config.qualifier,
      body: createSessionInput,
    });
    const response = await this.fc20230330Client.createSession(functionName, createSessionRequest);
    const { body } = response.toMap();
    return body;
  }

  async getFunctionSession(functionName: string, sessionId: string, qualifier: string) {
    const getSessionRequest = new GetSessionRequest({ qualifier });
    const response = await this.fc20230330Client.getSession(
      functionName,
      sessionId,
      getSessionRequest,
    );
    const { body } = response.toMap();
    return body;
  }

  async updateFunctionSession(functionName: string, sessionId: string, config: any) {
    const updateSessionInput = new UpdateSessionInput({
      sessionTTLInSeconds: config.sessionTTLInSeconds,
      sessionIdleTimeoutInSeconds: config.sessionIdleTimeoutInSeconds,
    });
    const updateSessionRequest = new UpdateSessionRequest({
      qualifier: config.qualifier,
      body: updateSessionInput,
    });
    const response = await this.fc20230330Client.updateSession(
      functionName,
      sessionId,
      updateSessionRequest,
    );
    const { body } = response.toMap();
    return body;
  }

  async listFunctionSessions(
    functionName: string,
    queryParams?: {
      limit?: number;
      nextToken?: string;
      qualifier?: string;
      sessionId?: string;
      sessionStatus?: string;
    },
  ) {
    const listSessionsRequest = new ListSessionsRequest(queryParams);
    const response = await this.fc20230330Client.listSessions(functionName, listSessionsRequest);
    const { body } = response.toMap();
    return body;
  }

  async removeFunctionSession(functionName: string, sessionId: string, qualifier: string) {
    const deleteSessionRequest = new DeleteSessionRequest({ qualifier });
    const response = await this.fc20230330Client.deleteSession(
      functionName,
      sessionId,
      deleteSessionRequest,
    );
    const { body } = response.toMap();
    return body;
  }

  tagsToLowerCase(tags) {
    if (!tags) {
      return [];
    }
    const newTags = [];
    for (const tag of tags) {
      const newTag = {};
      for (const key in tag) {
        if (Object.prototype.hasOwnProperty.call(tag, key)) {
          const lowerCaseKey = key.toLowerCase();
          newTag[lowerCaseKey] = tag[key];
        }
      }
      newTags.push(newTag);
    }
    return newTags;
  }

  isUpdateTags(remoteTags, localTags) {
    if (remoteTags?.length !== localTags?.length) {
      return true;
    }
    const noNeedUpdate = remoteTags?.every((item) => {
      return localTags?.some((localItem) => {
        return localItem.key === item.key && localItem.value === item.value;
      });
    });
    return !noNeedUpdate;
  }

  diffTags(remoteTags, localTags) {
    const deleteTags = remoteTags
      ?.filter((item) => {
        return !localTags?.some((localItem) => {
          return localItem.key === item.key && localItem.value === item.value;
        });
      })
      .map((item) => item.key);
    const addTags = localTags?.filter((item) => {
      return !remoteTags?.some((remoteItem) => {
        return remoteItem.key === item.key && remoteItem.value === item.value;
      });
    });

    return {
      deleteTags,
      addTags,
    };
  }

  checkTags(tags) {
    if (tags.length > 20) {
      throw new Error(
        `The number of tags cannot exceed 20,the overall modification will not be executed.`,
      );
    }
    // 检查标签键是否重复
    const keys = new Set();

    for (const tag of tags) {
      const { key } = tag;
      if (keys.has(key)) {
        throw new Error(
          `The tag keys must be unique. repeat keys: ${key},the overall modification will not be executed.`,
        );
      } else {
        keys.add(key);
      }
    }
  }

  async changeFunctionResourceGroup(functionName: string, resourceGroupId: string) {
    const request = new ChangeResourceGroupRequest({
      body: new ChangeResourceGroupInput({
        newResourceGroupId: resourceGroupId,
        resourceId: functionName,
        resourceType: 'function',
      }),
    });
    const result = await this.fc20230330Client.changeResourceGroup(request);
    const { statusCode } = result.toMap();
    if (statusCode === 200) {
      logger.debug(`changeResourceGroup success`);
    } else {
      logger.error(`changeResourceGroup failed, statusCode: ${statusCode}`);
    }
    return statusCode;
  }
}
