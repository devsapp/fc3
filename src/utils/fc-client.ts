import { ICredentials } from '@serverless-devs/component-interface';
import { Config } from '@alicloud/openapi-client';
import FCClient from '@alicloud/fc20230330';
import FC2 from '@alicloud/fc2';
import { getCustomEndpoint, timeout } from '../default/client';

export const fc2Client = (region: string, credentials: ICredentials) => {
  const { endpoint } = getCustomEndpoint();

  return new FC2(credentials.AccountID, {
    accessKeyID: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    securityToken: credentials.SecurityToken,
    region,
    endpoint,
    secure: true,
    timeout,
  });
};

const fc20230330Client = (region: string, credentials: ICredentials): FCClient => {
  const {
    AccountID: accountID,
    AccessKeyID: accessKeyId,
    AccessKeySecret: accessKeySecret,
    SecurityToken: securityToken,
  } = credentials;

  const { host: endpoint = `${accountID}.${region}.fc.aliyuncs.com`, protocol = 'https' } =
    getCustomEndpoint();

  const config = new Config({
    accessKeyId,
    accessKeySecret,
    securityToken,
    protocol,
    endpoint,
    readTimeout: timeout,
    connectTimeout: timeout,
  });

  return new FCClient(config);
};

export default fc20230330Client;
