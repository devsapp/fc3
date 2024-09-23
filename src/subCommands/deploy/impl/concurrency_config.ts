import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Base from './base';

interface IOpts {
  yes: boolean | undefined;
}

export default class ConcurrencyConfig extends Base {
  local: any;
  remote: any;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    this.local = _.get(inputs, 'props.concurrencyConfig');
    logger.debug(`need deploy concurrencyConfig: ${JSON.stringify(this.local)}`);
  }

  async before() {
    await this.getRemote();

    await this.plan();
  }

  async run() {
    const remoteConfig = this.remote || {};
    const id = `${this.functionName}/concurrencyConfig`;
    if (!_.isEmpty(this.local)) {
      const { reservedConcurrency } = this.local;
      if (this.needDeploy) {
        await this.fcSdk.putFunctionConcurrency(this.functionName, reservedConcurrency);
      } else if (_.isEmpty(remoteConfig)) {
        // 如果不需要部署，但是远端资源不存在，则尝试创建一下
        logger.debug(
          `Online concurrencyConfig does not exist, specified not to deploy, attempting to create ${id}`,
        );
        await this.fcSdk.putFunctionConcurrency(this.functionName, reservedConcurrency);
      } else {
        logger.debug(
          `Online concurrencyConfig exists, specified not to deploy, skipping deployment ${id}`,
        );
      }
    }
    return this.needDeploy;
  }

  private async getRemote() {
    try {
      const result = await this.fcSdk.getFunctionConcurrency(this.functionName);
      const r = _.omit(result, ['functionArn']);
      this.remote = r;
    } catch (ex) {
      logger.debug(`Get remote concurrencyConfig of  ${this.functionName} error: ${ex.message}`);
      this.remote = {};
    }
  }

  private async plan() {
    if (_.isEmpty(this.remote)) {
      this.needDeploy = true;
      return;
    }
    const { diffResult, show } = diffConvertYaml(this.remote, this.local);
    logger.debug(`diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`diff show:\n${show}`);

    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      this.needDeploy = true;
      return;
    }
    logger.write(`concurrencyConfig was changed, please confirm before deployment:\n`);
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
