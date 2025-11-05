import { ICredentials } from '@serverless-devs/component-interface';
import Oss from '@serverless-cd/srm-aliyun-oss';
import { IRegion } from '../../interface';
import logger from '../../logger';
import { isAppCenter } from '../../utils/index';

export default class OSS {
  readonly client: Oss;
  private config: any;

  constructor(private region: IRegion, credentials: ICredentials, ossEndpoint: string) {
    this.config = {
      accountID: credentials.AccountID,
      accessKeyId: credentials.AccessKeyID,
      accessKeySecret: credentials.AccessKeySecret,
      securityToken: credentials.SecurityToken,
      endpoint: ossEndpoint,
      regionId: region,
      timeout: process.env.OSS_CLIENT_TIMEOUT || 60000,
    };
    this.client = new Oss(logger);
  }

  async deploy(ossMountConfig = 'auto'): Promise<{
    ossBucket: string;
    readOnly?: boolean;
    mountDir?: string;
    bucketPath?: string;
  }> {
    logger.debug(`init oss: ${JSON.stringify(this.config)}`);
    const result = await this.client.initOss(this.config, ossMountConfig);
    const ossBucket = result?.ossBucket || '';
    const readOnly = result?.readOnly || false;
    const mountDir = result?.mountDir || `/mnt/${ossBucket}`;
    const bucketPath = result?.bucketPath || `/`;
    if (isAppCenter()) {
      logger.info(`created oss region: ${this.region};`);
    } else {
      logger.spin('creating', 'oss', `region: ${this.region}; ossBucket: ${ossBucket}`);
    }
    return { ossBucket, readOnly, mountDir, bucketPath };
  }
}
