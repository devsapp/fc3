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
        logger.debug(`DescribeVpcAttribute: ${JSON.stringify(result)}`);
        if (
          result.VpcName.trim() === '' ||
          result.VpcName.trim() === '""' ||
          result.VpcName.trim() === "''"
        ) {
          result.VpcName = `VpcName-${vpcId}`;
          const params2 = {
            RegionId: this.region,
            VpcId: vpcId,
            VpcName: result.VpcName,
          };
          const result2: any = await this.vpcClient.request(
            'ModifyVpcAttribute',
            params2,
            requestOption,
          );
          logger.debug(`ModifyVpcAttribute: ${JSON.stringify(result2)}`);
        }
        // } else {
        //   const regex = /^(?!http:\/\/|https:\/\/)[a-zA-Z一-龥][a-zA-Z0-9一-龥_-]*$/;
        //   if (!regex.test(result.VpcName)) {
        //     return VPC_AND_NAS_NAME;
        //   }
        // }
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
    logger.debug(`rule: ${rule}, nasAuto: ${nasAuto}, vpcConfig: ${JSON.stringify(vpcConfig)}`);
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
