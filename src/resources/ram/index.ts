import { ICredentials } from '@serverless-devs/component-interface';
import Ram from '@serverless-cd/srm-aliyun-ram20150501';
import { Config } from '@alicloud/openapi-client';
import _ from 'lodash';
import logger from '../../logger';

export default class Role {
  static isRoleArnFormat = (role: string): boolean => /^acs:ram::\d+:role\/.+/.test(role);

  static completionArn(role: string, accountID: string): string {
    if (!_.isString(role)) {
      logger.debug(`Role ${role} is not a string, skipping handle`);
      return role;
    }

    if (this.isRoleArnFormat(role)) {
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
