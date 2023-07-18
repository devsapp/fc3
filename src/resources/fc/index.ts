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
import { fc20230330Client, fc2Client } from './client';
import { IFunction, Runtime } from '../../interface';
import logger from '../../logger';
import path from 'path';
import { FC_API_NOT_FOUND_ERROR_CODE } from '../../constant';
import _ from 'lodash';

export default class FC {
  static isCustomContainerRuntime = (runtime: string): boolean =>
    runtime === Runtime['custom-container'];
  static isCustomRuntime = (runtime: string): boolean =>
    runtime === Runtime['custom'] || runtime === Runtime['custom.debian10'];

  readonly fc20230330Client: FC20230330;

  constructor(private region: string, private credentials: ICredentials) {
    this.fc20230330Client = fc20230330Client(region, credentials);
  }

  async getFunction(
    functionName: string,
    type: 'original' | 'simple' = 'original',
  ): Promise<GetFunctionResponse | Record<string, any>> {
    const getFunctionRequest = new GetFunctionRequest({});
    const result = await this.fc20230330Client.getFunction(functionName, getFunctionRequest);
    logger.debug(`Get function ${functionName} response:`);
    logger.debug(result);

    if (type === 'original') {
      return result;
    }

    const body = result.toMap().body;
    return _.omit(body, [
      'lastModifiedTime',
      'functionId',
      'createdTime',
      'codeSize',
      'codeChecksum',
    ]);
  }

  async createFunction(config: IFunction): Promise<CreateFunctionResponse> {
    const request = new CreateFunctionRequest({
      body: new CreateFunctionInput(config),
    });

    return await this.fc20230330Client.createFunction(request);
  }

  async updateFunction(config: IFunction): Promise<UpdateFunctionResponse> {
    const request = new UpdateFunctionRequest({
      body: new UpdateFunctionInput(config),
    });

    return await this.fc20230330Client.updateFunction(config.functionName, request);
  }

  async deployFunction(config: IFunction): Promise<void> {
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

    if (!needUpdate) {
      logger.debug(`Need create function ${config.functionName}`);
      try {
        await this.createFunction(config);
        return;
      } catch (ex) {
        logger.debug('create function error: ', ex);
        if (ex.code !== FC_API_NOT_FOUND_ERROR_CODE.FunctionAlreadyExists) {
          // TODO: 处理其他的错误码
          throw ex;
        }
        logger.debug('Create functions already exists, retry update function');
      }
    }

    logger.debug(`Need update function ${config.functionName}`);
    await this.updateFunction(config);
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
}

export * from './client';
