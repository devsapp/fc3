import OSS from 'ali-oss';
import axios from 'axios';
import path from 'path';
import _ from 'lodash';
import {
  GetFunctionRequest,
  GetFunctionResponse,
  ListFunctionVersionsRequest,
  ListTriggersRequest,
} from '@alicloud/fc20230330';
import { RuntimeOptions } from '@alicloud/tea-util';

import logger from '../../logger';
import { sleep } from '../../utils';
import { FC_DEPLOY_RETRY_COUNT } from '../../default/config';

import FC_Client, { fc2Client } from './impl/client';
import { ICustomContainerConfig, IFunction, ILogConfig, ITrigger } from '../../interface';
import { FC_API_ERROR_CODE, isAccessDenied, isSlsNotExistException } from './error-code';
import {
  isCustomContainerRuntime,
  isCustomRuntime,
  isContainerAccelerated,
  computeLocalAuto,
} from './impl/utils';
import replaceFunctionConfig from './impl/replace-function-config';
import { IAlias } from '../../interface/cli-config/alias';

export enum GetApiType {
  original = 'original', // 直接返回接口返回值
  simple = 'simple', // 返回数据时删除空配置
  simpleUnsupported = 'simple-unsupported', // 返回数据时删除：空配置、系统字段
}

export default class FC extends FC_Client {
  static computeLocalAuto = computeLocalAuto;
  static isCustomContainerRuntime = isCustomContainerRuntime;
  static isCustomRuntime = isCustomRuntime;
  static isContainerAccelerated = isContainerAccelerated;
  static replaceFunctionConfig = replaceFunctionConfig;

  /**
   * 创建或者修改函数
   */
  async deployFunction(config: IFunction, { slsAuto, type }): Promise<void> {
    logger.debug(`Deploy function use config:\n${JSON.stringify(config, null, 2)}`);
    let needUpdate = false;
    try {
      await this.getFunction(config.functionName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug(
          `Checking function ${config.functionName} error: ${err.message}, retrying create`,
        );
      }
    }

    const isContainerAccelerated = FC.isContainerAccelerated(
      config.customContainerConfig as ICustomContainerConfig,
    );

    let retry = 0;
    let retryTime = 3;

    // 计算是否超时
    const currentTime = new Date().getTime();
    const calculateRetryTime = (minute: number) =>
      currentTime - new Date().getTime() > minute * 60 * 1000;

    while (true) {
      try {
        if (!needUpdate) {
          logger.debug(`Need create function ${config.functionName}`);
          try {
            await this.createFunction(config);
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

        logger.debug(`Need update function ${config.functionName}`);
        if (type === 'code') {
          // @ts-ignore
          config = {
            functionName: config.functionName,
            code: config.code,
            customContainerConfig: config.customContainerConfig,
          };
        } else if (type === 'config') {
          _.unset(config, 'code');
          _.unset(config, 'customContainerConfig');
        }
        await this.updateFunction(config);
        return;
      } catch (ex) {
        logger.debug(`Deploy function error: ${ex}`);

        /**
         * 重试机制
          ○ 如果是权限问题不重重试直接异常
          ○ 部署镜像并且使用 _accelerated 结尾：报错镜像不存在，需要重试 3min
          ○ 首次创建日志：报错日志不存在，需要重试 3min
          ○ 默认重试 3 次
        */
        const { project, logstore } = (config.logConfig || {}) as ILogConfig;
        const retrySls = slsAuto && isSlsNotExistException(project, logstore, ex);
        const retryContainerAccelerated = isContainerAccelerated; // TODO: 部署镜像并且使用 _accelerated 结尾：报错镜像不存在
        // TODO: 如果是权限问题不重试直接异常
        if (isAccessDenied(ex)) {
          throw ex;
        } else if (retrySls || retryContainerAccelerated) {
          if (calculateRetryTime(3)) {
            throw ex;
          }
          retryTime = 5;
        } else if (retry > FC_DEPLOY_RETRY_COUNT) {
          throw ex;
        }
        retry += 1;

        logger.spin(
          'retrying',
          'function',
          needUpdate ? 'update' : 'create',
          `${this.region}/${config.functionName}`,
          retry,
        );

        await sleep(retryTime);
      }
    }
  }

  /**
   * 创建或者修改触发器
   */
  async deployTrigger(functionName: string, config: ITrigger): Promise<void> {
    logger.debug(`Deploy trigger use config(${functionName}): ${JSON.stringify(config)}`);

    let needUpdate = false;
    const triggerName = config.triggerName;
    const id = `${functionName}/${triggerName}`;
    try {
      await this.getTrigger(functionName, triggerName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug(`Checking trigger ${id} error: ${err.message}, retrying create.`);
      }
    }

    let retry = 0;
    logger.debug(`Deploy ${functionName} trigger:\n${JSON.stringify(config, null, 2)}`);
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
            if (ex.code !== FC_API_ERROR_CODE.FunctionAlreadyExists) {
              throw ex;
            }
            logger.debug('Create trigger already exists, retry update');
            needUpdate = true;
          }
        }

        logger.debug(`Need update trigger ${id}`);
        await this.updateTrigger(functionName, triggerName, config);
        return;
      } catch (ex) {
        logger.debug(`Deploy trigger error: ${ex}`);

        // TODO: 如果是权限问题不重试直接异常
        if (isAccessDenied(ex)) {
          throw ex;
        } else if (retry > FC_DEPLOY_RETRY_COUNT) {
          throw ex;
        }
        retry += 1;

        logger.spin(
          'retrying',
          'trigger',
          needUpdate ? 'update' : 'create',
          `${this.region}/${id}`,
          retry,
        );

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

    const body = result.toMap().body;
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

    if (_.isEmpty(body.tracingConfig)) {
      _.unset(body, 'tracingConfig');
    }

    if (_.isEmpty(body.environmentVariables)) {
      _.unset(body, 'environmentVariables');
    }

    if (type === GetApiType.simpleUnsupported) {
      const r = _.omit(body, [
        'lastModifiedTime',
        'functionId',
        'createdTime',
        'codeSize',
        'codeChecksum',
        'functionArn',
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
    const { body } = result.toMap();
    body.triggerConfig = JSON.parse(body.triggerConfig);

    if (type === GetApiType.simpleUnsupported) {
      const r = _.omit(body, ['createdTime', 'httpTrigger', 'lastModifiedTime', 'triggerId']);
      logger.debug(`Result body: ${JSON.stringify(r)}`);
      return r;
    }

    logger.debug(`Result body: ${JSON.stringify(body)}`);
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
        await this.createAlias(functionName, config);
        return;
      } catch (ex) {
        logger.debug(`Create function error: ${ex.message}`);
        if (ex.code !== FC_API_ERROR_CODE.AliasAlreadyExists) {
          throw ex;
        }
        logger.debug('Create functions already exists, retry update');
        needUpdate = true;
      }
    }

    await this.updateAlias(functionName, aliasName, config);
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

  async listTriggers(functionName: string) {
    let nextToken: string;
    const limit = 1;
    const triggers: any[] = [];

    while (true) {
      const request = new ListTriggersRequest({ limit, nextToken });
      const runtime = new RuntimeOptions({});
      const headers = {};
      const result = await this.fc20230330Client.listTriggersWithOptions(
        functionName,
        request,
        headers,
        runtime,
      );
      const { body } = result.toMap();
      triggers.push(...body.triggers);
      if (!body.nextToken) {
        return triggers;
      }
      nextToken = body.nextToken;
    }
  }
}
