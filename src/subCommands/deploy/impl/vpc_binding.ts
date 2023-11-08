/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Base from './base';
import { GetApiType } from '../../../resources/fc';

interface IOpts {
  yes: boolean | undefined;
}

export default class VpcBinding extends Base {
  local: any;
  remote: any;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    this.local = _.cloneDeep(_.get(inputs, 'props.vpcBinding', {}));
    if (!_.isEmpty(this.local)) {
      this.local?.vpcIds.sort();
    }
    logger.debug(`need deploy vpcBinding: ${JSON.stringify(this.local)}`);
  }

  async before() {
    await this.getRemote();
    logger.debug(
      `vpcBinding ==> remote=${JSON.stringify(this.remote)}, local=${JSON.stringify(this.local)}`,
    );
    await this.plan();
  }

  async run() {
    const remoteConfig = this.remote || {};
    const localConfig = this.local;
    if (this.needDeploy) {
      const remoteVpcIds = _.get(remoteConfig, 'vpcIds', []);
      const localVpcIds = _.get(localConfig, 'vpcIds', []);
      // 计算 remoteVpcIds 中 localVpcIds 没有的元素
      const toDelVpcIds = remoteVpcIds.filter((vpcId) => !localVpcIds.includes(vpcId));
      // 计算 localVpcIds 中 remoteVpcIds 没有的元素
      const toAddVpcIds = localVpcIds.filter((vpcId) => !remoteVpcIds.includes(vpcId));

      console.log(
        `toDelVpcIds=${JSON.stringify(toDelVpcIds)}; toAddVpcIds=${JSON.stringify(toAddVpcIds)}`,
      );

      for (const vpcId of toDelVpcIds) {
        await this.fcSdk.deleteVpcBinding(this.functionName, vpcId);
      }
      for (const vpcId of toAddVpcIds) {
        await this.fcSdk.createVpcBinding(this.functionName, vpcId);
      }
    }
    return this.needDeploy;
  }

  private async getRemote() {
    try {
      const result = await this.fcSdk.getVpcBinding(
        this.functionName,
        GetApiType.simpleUnsupported,
      );
      this.remote = result;
      if (!_.isEmpty(this.remote)) {
        this.remote?.vpcIds.sort();
      }
    } catch (ex) {
      logger.debug(`Get remote vpcBinding of  ${this.functionName} error: ${ex.message}`);
      this.remote = [];
    }
  }

  private async plan() {
    const { diffResult, show } = diffConvertYaml(this.remote, this.local);
    logger.debug(`diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`diff show:\n${show}`);

    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      this.needDeploy = true;
      return;
    }
    logger.write(`vpcBinding was changed, please confirm before deployment:\n`);
    logger.write(show);

    // 用户指定了 --assume-yes，不再交互
    if (_.isBoolean(this.needDeploy)) {
      return;
    }
    logger.write(
      `\n* You can also specify to use local configuration through --assume-yes/-y during deployment`,
    );
    const message = `Deploy it with local config?`;
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message,
      },
    ]);
    this.needDeploy = answers.ok;
  }
}
