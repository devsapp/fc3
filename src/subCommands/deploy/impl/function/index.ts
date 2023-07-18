import _ from 'lodash';
import { simpleDiff } from '@serverless-devs/diff';
import inquirer from 'inquirer';

import Utils from './utils';
import logger from '../../../../logger';
import Role from '../../../../resources/ram';
import FC from '../../../../resources/fc';

export default class Service extends Utils {
  /**
   * 准备动作
   */
  async preRun() {
    await this.getRemote();
    await this.initLocal();
    await this.plan();
  }

  async run() {
    if (!this.needDeploy) {
      logger.debug('Detection does not require deployment of function, skipping deployment');
      return;
    }

    // 如果不是仅仅部署代码包，就需要处理一些资源配置
    if (this.type !== 'code') {
      // this.local = await resources.initFunctionAuto(this.local);
    }

    // 如果不是仅仅部署配置，就需要处理代码
    if (this.type !== 'config') {
      if (!FC.isCustomContainerRuntime(this.local?.runtime)) {
        await this.uploadCode();
      } else if (!this.skipPush) {
        await this.pushImage();
      }
    }

    await this.fcSdk.deployFunction(this.local);
  }

  /**
   * diff 处理
   */
  private async plan(): Promise<void> {
    // 远端不存在，或者 get 异常跳过 plan 直接部署
    if (!this.remote || this.type === 'code') {
      this.needDeploy = true;
      return;
    }

    const code = this.local.code;
    _.unset(this.local, 'code');
    const { diffResult, show } = simpleDiff(this.remote, this.local);
    _.set(this.local, 'code', code);

    logger.debug(`diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`diff show:\n${show}`);
    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      this.needDeploy = true;
      return;
    }
    logger.write(
      `Function ${this.local.functionName} was changed, please confirm before deployment:\n`,
    );
    logger.write(show);
    // 用户指定了 --yes 或者 --no-yes，不再交互
    if (_.isBoolean(this.needDeploy)) {
      return;
    }
    logger.write(
      `\n* You can also specify to use local configuration through --yes/-y during deployment`,
    );
    const message = `Deploy it with local config or skip deploy?`;
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message,
      },
    ]);
    this.needDeploy = answers.ok;
  }

  /**
   * 将本地配置:
   *  1. 如果 rule 仅写了名字，需要处理成 arn
   *  2. 如果线上资源存在，auto 需要直接复用线上资源
   */
  private async initLocal() {
    logger.debug(`Pre init local config: ${JSON.stringify(this.local)}`);
    // 兼容只写 rule 的情况
    if (_.isString(this.local.role) && !this.local.role) {
      const accountID = super.inputs.credential.AccountID;
      _.set(this.local, 'role', Role.completionArn(this.local.role, accountID));
    }

    // 线上配置如果存在，则需要将 auto 资源替换为线上资源配置
    if (this.remote) {
      const { remoteNasConfig, remoteVpcConfig, remoteLogConfig, remoteRole } =
        this.getRemoveResourceConfig();
      const { nasAuto, vpcAuto, slsAuto, roleAuto } = this.computeLocalAuto();
      logger.debug(
        `Init local compute local auto, nasAuto: ${nasAuto}; vpcAuto: ${vpcAuto}; slsAuto: ${slsAuto}; roleAuto: ${roleAuto}`,
      );

      if (nasAuto && !_.isEmpty(remoteNasConfig?.mountPoints)) {
        _.set(this.local, 'nasConfig', remoteNasConfig);
      }

      if (vpcAuto && remoteVpcConfig?.vpcId) {
        _.set(this.local, 'vpcConfig', remoteVpcConfig);
      }

      if (slsAuto && !_.isEmpty(remoteLogConfig?.project)) {
        _.set(this.local, 'nasConfig', remoteLogConfig);
      }

      if (roleAuto) {
        _.set(this.local, 'role', _.isString(remoteRole) ? remoteRole : 'auto');
      } else {
        _.set(this.local, 'role', '');
      }
    }

    logger.debug(`Post init local config: ${JSON.stringify(this.local)}`);
  }
}
