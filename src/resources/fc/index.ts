import { ICredentials } from '@serverless-devs/component-interface';
import FC20230330 from '@alicloud/fc20230330';
import OSS from 'ali-oss';
import axios from 'axios';
import { fc20230330Client, fc2Client } from './client';
import { Runtime } from '../../interface';
import logger from '../../logger';
import path from 'path';

export default class FC {
  static isCustomContainerRuntime = (runtime: string): boolean =>
    runtime === Runtime['custom-container'];
  static isCustomRuntime = (runtime: string): boolean =>
    runtime === Runtime['custom'] || runtime === Runtime['custom.debian10'];

  readonly fc20230330Client: FC20230330;

  constructor(private region: string, private credentials: ICredentials) {
    this.fc20230330Client = fc20230330Client(region, credentials);
  }

  async init(config: any): Promise<void> {}

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
