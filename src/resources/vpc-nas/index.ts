import PopClient from '@serverless-cd/srm-aliyun-pop-core';
import { ICredentials } from '@serverless-devs/component-interface';

import { IRegion, IVpcConfig } from '../../interface';
import { VPC_AND_NAS_NAME } from '../../default/resources';
import _ from 'lodash';
import { IGetInitNasConfigAsFcResponse } from '@serverless-cd/srm-aliyun-pop-core/dist/nas-2017-06-26';
import logger from '../../logger';

export default class VpcNas {
  private client: PopClient;
  private vpcClient: PopClient;

  constructor(private region: IRegion, credentials: ICredentials) {
    this.client = new PopClient(
      {
        accessKeyId: credentials.AccessKeyID,
        accessKeySecret: credentials.AccessKeySecret,
        securityToken: credentials.SecurityToken,
        endpoint: `http://nas.${region}.aliyuncs.com`,
        apiVersion: '2017-06-26',
      },
      logger,
    );

    this.vpcClient = new PopClient(
      {
        accessKeyId: credentials.AccessKeyID,
        accessKeySecret: credentials.AccessKeySecret,
        securityToken: credentials.SecurityToken,
        endpoint: `http://vpc.${region}.aliyuncs.com`,
        apiVersion: '2016-04-28',
      },
      logger,
    );
  }

  async getVpcNasRule(vpcConfig: IVpcConfig): Promise<string> {
    if (_.isObject(vpcConfig) && vpcConfig?.vpcId) {
      const { vpcId } = vpcConfig;
      const params = {
        RegionId: this.region,
        VpcId: vpcId,
      };
      const requestOption = {
        method: 'POST',
        formatParams: false,
      };

      try {
        const result: any = await this.vpcClient.request(
          'DescribeVpcAttribute',
          params,
          requestOption,
        );
        logger.debug(JSON.stringify(result));
        return result.VpcName;
      } catch (ex) {
        console.log(ex);
      }
    }
    return VPC_AND_NAS_NAME;
  }

  async deploy({
    nasAuto,
    vpcConfig,
  }: {
    nasAuto: boolean;
    vpcConfig?: IVpcConfig;
  }): Promise<IGetInitNasConfigAsFcResponse | { vpcConfig: IVpcConfig }> {
    const rule = await this.getVpcNasRule(vpcConfig);
    logger.debug(`rule: ${rule}`);
    const params = {
      rule,
      region: this.region,
    };

    if (nasAuto) {
      _.set(params, 'vpcConfig', vpcConfig);
      return await this.client.getInitNasConfigAsFc(params);
    }

    logger.debug(JSON.stringify(params));
    const { vpcId, vSwitchIds, securityGroupId } = await this.client.getInitVpcConfigAsFc(params);
    return {
      vpcConfig: { vpcId, vSwitchIds, securityGroupId },
    };
  }
}
