import { ICredentials } from '@serverless-devs/component-interface';
import Oss from '@serverless-cd/srm-aliyun-oss';
import { Config } from '@alicloud/openapi-client';
import { IRegion } from '../../interface';
import logger from '../../logger';
import { isAppCenter } from '../../utils/index';

export default class OSS {
  readonly client: Oss;
  private config: Config;

  constructor(private region: IRegion, credentials: ICredentials, ossEndpoint: string) {
    this.config = new Config({
      accountID: credentials.AccountID,
      accessKeyId: credentials.AccessKeyID,
      accessKeySecret: credentials.AccessKeySecret,
      securityToken: credentials.SecurityToken,
      endpoint: ossEndpoint,
      regionId: region,
      timeout: process.env.OSS_CLIENT_TIMEOUT || 60000,
    });
    this.client = new Oss();
  }

  async deploy(): Promise<{ ossBucket: string }> {
    logger.debug(`init oss: ${JSON.stringify(this.config)}`);
    const result = await this.client.initOss(this.config);
    const ossBucket = result?.ossBucket || '';
    if (isAppCenter()) {
      logger.info(`created oss region: ${this.region};`);
    } else {
      logger.spin('creating', 'oss', `region: ${this.region}; ossBucket: ${ossBucket}`);
    }
    return { ossBucket };
  }
}
