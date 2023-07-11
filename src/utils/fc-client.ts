import { ICredentials } from '@serverless-devs/component-interface';
import { Config } from '@alicloud/openapi-client';
import FCClient from '@alicloud/fc20230330';

export default (region: string, credentials: ICredentials) => {
  const {
    AccountID: accountID,
    AccessKeyID: accessKeyId,
    AccessKeySecret: accessKeySecret,
    SecurityToken: securityToken,
  } = credentials;

  const endpoint = `${accountID}.${region}.fc.aliyuncs.com`;
  const protocol = 'https';

  const config = new Config({
    accessKeyId,
    accessKeySecret,
    securityToken,

    protocol,
    endpoint,
  });

  return new FCClient(config);
}