import { ICredentials } from '@serverless-devs/component-interface';
import { Config } from '@alicloud/openapi-client';
import FCClient from '@alicloud/fc20230330';
import FC2 from '@alicloud/fc2';
import { getCustomEndpoint, FC_CLIENT_DEFAULT_TIMEOUT } from '../../../default/client';
import { IRegion } from '../../../interface';

export const fc2Client = (region: IRegion, credentials: ICredentials) => {
  const { endpoint } = getCustomEndpoint();

  return new FC2(credentials.AccountID, {
    accessKeyID: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    securityToken: credentials.SecurityToken,
    region,
    endpoint,
    secure: true,
    timeout: FC_CLIENT_DEFAULT_TIMEOUT,
  });
};

export const fc20230330Client = (region: IRegion, credentials: ICredentials): FCClient => {
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
    readTimeout: FC_CLIENT_DEFAULT_TIMEOUT,
    connectTimeout: FC_CLIENT_DEFAULT_TIMEOUT,
  });

  return new FCClient(config);
};
