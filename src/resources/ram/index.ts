import { ICredentials } from '@serverless-devs/component-interface';
import Ram from '@serverless-cd/srm-aliyun-ram20150501';
import { Config } from '@alicloud/openapi-client';
import logger from '../../logger';
import _ from 'lodash';

export default class Role {
  static completionArn(role: string, accountID: string): string {
    if (!_.isString(role)) {
      logger.debug(`Role ${role} is not a string, skipping handle`);
      return role;
    }

    if (/^acs:ram::\d+:role\/.+/.test(role)) {
      logger.debug(`Use role: ${role}`);
      return role;
    }

    const arn = `acs:ram::${accountID}:role/${role}`;
    logger.debug(`Assemble role: ${arn}`);
    return arn;
  }

  readonly client: Ram;

  constructor(credentials: ICredentials) {
    const config = new Config({
      accessKeyId: credentials.AccessKeyID,
      accessKeySecret: credentials.AccessKeySecret,
      securityToken: credentials.SecurityToken,
      endpoint: 'ram.aliyuncs.com',
    });
    this.client = new Ram(credentials.AccountID, config);
  }
}
