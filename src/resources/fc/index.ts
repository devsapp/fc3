import { ICredentials } from '@serverless-devs/component-interface';
import FC20230330, {
  CreateFunctionInput,
  CreateFunctionRequest,
  CreateFunctionResponse,
  GetFunctionRequest,
  GetFunctionResponse,
  UpdateFunctionInput,
  UpdateFunctionRequest,
  UpdateFunctionResponse,
} from '@alicloud/fc20230330';
import OSS from 'ali-oss';
import axios from 'axios';
import path from 'path';
import _ from 'lodash';

import logger from '../../logger';
import { sleep } from '../../utils';
import { FC_DEPLOY_RETRY_COUNT } from '../../default/client';

import { fc20230330Client, fc2Client } from './impl/client';
import { IFunction, ILogConfig, IRegion } from '../../interface';
import { FC_API_NOT_FOUND_ERROR_CODE, isAccessDenied, isSlsNotExistException } from './error-code';
import {
  isCustomContainerRuntime,
  isCustomRuntime,
  isContainerAccelerated,
  computeLocalAuto,
} from './impl/utils';
import replaceFunctionConfig from './impl/replace-function-config';

export default class FC {
  static computeLocalAuto = computeLocalAuto;
  static isCustomContainerRuntime = isCustomContainerRuntime;
  static isCustomRuntime = isCustomRuntime;
  static isContainerAccelerated = isContainerAccelerated;
  static replaceFunctionConfig = replaceFunctionConfig;

  readonly fc20230330Client: FC20230330;

  constructor(private region: IRegion, private credentials: ICredentials) {
    this.fc20230330Client = fc20230330Client(region, credentials);
  }

  /**
   * 创建或者修改函数
   */
  async deployFunction(config: IFunction, { slsAuto }): Promise<void> {
    logger.debug(`Deploy function use config: ${JSON.stringify(config)}`);
    let needUpdate = false;
    try {
      await this.getFunction(config.functionName);
      needUpdate = true;
    } catch (err) {
      if (err.code !== FC_API_NOT_FOUND_ERROR_CODE.FunctionNotFound) {
        logger.warn(
          `Checking function ${config.functionName} error: ${err.message}, retrying create function.`,
        );
      }
    }

    const isContainerAccelerated = FC.isContainerAccelerated(config.customContainerConfig);

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
            if (ex.code !== FC_API_NOT_FOUND_ERROR_CODE.FunctionAlreadyExists) {
              throw ex;
            }
            logger.debug('Create functions already exists, retry update function');
            needUpdate = true;
          }
        }

        logger.debug(`Need update function ${config.functionName}`);
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
        // TODO: 如果是权限问题不重重试直接异常
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
   * 上传代码包到临时 oss
   * @param functionName
   * @param zipFile
   * @returns
   */
  async uploadCodeToTmpOss(
    zipFile: string,
  ): Promise<{ ossBucketName: string; ossObjectName: string }> {
    const client = fc2Client(this.region, this.credentials);

    const {
      data: { ossRegion, credentials, ossBucket, objectName },
    } = await client.getTempBucketToken();
    const ossClient = new OSS({
      region: ossRegion,
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
    await ossClient.put(ossObjectName, path.normalize(zipFile));

    const config = { ossBucketName: ossBucket, ossObjectName };
    logger.debug(`tempCodeBucketToken response: ${JSON.stringify(config)}`);
    return config;
  }

  /**
   * 获取函数
   * @param functionName
   * @param type 'original' 接口返回值 | 'simple' 返回简单处理之后的值
   */
  async getFunction(
    functionName: string,
    type: 'original' | 'simple' | 'simple-unsupported' = 'original',
  ): Promise<GetFunctionResponse | Record<string, any>> {
    const getFunctionRequest = new GetFunctionRequest({});
    const result = await this.fc20230330Client.getFunction(functionName, getFunctionRequest);
    logger.debug(`Get function ${functionName} response:`);
    logger.debug(result);

    if (type === 'original') {
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

    if (type === 'simple-unsupported') {
      const r = _.omit(body, [
        'lastModifiedTime',
        'functionId',
        'createdTime',
        'codeSize',
        'codeChecksum',
      ]);
      logger.debug(`Result body: ${JSON.stringify(r)}`);
      return r;
    }

    logger.debug(`Result body: ${JSON.stringify(body)}`);
    return body;
  }

  // async getTrigger(functionName: string, triggerName: string, ): Promise<any>{
  //   const result = await this.fc20230330Client.getTrigger();
  // }

  private async createFunction(config: IFunction): Promise<CreateFunctionResponse> {
    const request = new CreateFunctionRequest({
      body: new CreateFunctionInput(config),
    });

    return await this.fc20230330Client.createFunction(request);
  }

  private async updateFunction(config: IFunction): Promise<UpdateFunctionResponse> {
    const request = new UpdateFunctionRequest({
      body: new UpdateFunctionInput(config),
    });

    return await this.fc20230330Client.updateFunction(config.functionName, request);
  }
}
