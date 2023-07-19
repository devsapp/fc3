import PopClient from '@serverless-cd/srm-aliyun-pop-core';
import { ICredentials } from '@serverless-devs/component-interface';

import { IRegion, IVpcConfig } from '../../interface';
import { VPC_AND_NAS_NAME } from '../../default/resources';
import _ from 'lodash';
import { IGetInitNasConfigAsFcResponse } from '@serverless-cd/srm-aliyun-pop-core/dist/nas-2017-06-26';
import logger from '../../logger';

export default class Sls {
  private client: PopClient;

  constructor(private region: IRegion, credentials: ICredentials) {
    this.client = new PopClient({
      accessKeyId: credentials.AccessKeyID,
      accessKeySecret: credentials.AccessKeySecret,
      securityToken: credentials.SecurityToken,
      endpoint: `http://nas.${region}.aliyuncs.com`,
      apiVersion: '2017-06-26',
    }, logger);
  }

  async deploy({
    nasAuto,
    vpcConfig,
  }: {
    nasAuto: boolean; // 如果 nas 为
    vpcConfig?: IVpcConfig; // nasAuto 为 false 时，此值不生效
  }): Promise<IGetInitNasConfigAsFcResponse | { vpcConfig: IVpcConfig }> {
    const params = {
      rule: VPC_AND_NAS_NAME,
      region: this.region,
    };

    if (nasAuto) {
      _.set(params, 'vpcConfig', vpcConfig);
      return await this.client.getInitNasConfigAsFc(params);
    }

    const { vpcId, vSwitchIds, securityGroupId } = await this.client.getInitVpcConfigAsFc(params);
    return {
      vpcConfig: { vpcId, vSwitchIds, securityGroupId },
    };
  }
}
