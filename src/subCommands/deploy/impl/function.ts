import _ from 'lodash';
import { diffConvertYaml } from '@serverless-devs/diff';
import inquirer from 'inquirer';

import Utils from './function-utils';
import logger from '../../../logger';
import FC from '../../../resources/fc';
import { FC_RESOURCES_EMPTY_CONFIG } from '../../../default/config';

export default class Service extends Utils {
  /**
   * 准备动作
   */
  async preRun() {
    await this.getRemote();
    const { local, remote } = await FC.replaceFunctionConfig(this.local, this.remote);
    this.local = local;
    this.remote = remote;
    await this.plan();
  }

  async run() {
    if (!this.needDeploy) {
      logger.debug('Detection does not require deployment of function, skipping deployment');
      return;
    }

    // 如果不是仅仅部署代码包，就需要处理一些资源配置
    if (this.type !== 'code') {
      await this.deployAuto();
      logger.debug(`Deploy auto result: ${JSON.stringify(this.local)}`);
    }

    // 如果不是仅仅部署配置，就需要处理代码
    if (this.type !== 'config') {
      if (!FC.isCustomContainerRuntime(this.local?.runtime)) {
        await this.uploadCode();
      } else if (!this.skipPush) {
        await this.pushImage();
      }
    }

    const config = _.defaults(this.local, FC_RESOURCES_EMPTY_CONFIG);
    await this.fcSdk.deployFunction(config, {
      slsAuto: !_.isEmpty(this.createResource.sls),
    });
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
    const { diffResult, show } = diffConvertYaml(this.remote, this.local);
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
    const message = `Deploy it with local config or skip deploy function?`;
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
