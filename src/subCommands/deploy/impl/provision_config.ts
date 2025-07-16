import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Base from './base';
import { sleep } from '../../../utils';
// import Logs from '../../logs';

interface IOpts {
  yes: boolean | undefined;
}

export default class ProvisionConfig extends Base {
  local: any;
  remote: any;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const provisionConfig = _.get(inputs, 'props.provisionConfig', {});
    this.local = _.cloneDeep(provisionConfig);
    logger.debug(`need deploy provisionConfig: ${JSON.stringify(provisionConfig)}`);
  }

  async before() {
    await this.getRemote();

    await this.plan();
  }

  async run() {
    const remoteConfig = this.remote || {};
    const localConfig = this.local;

    const id = `${this.functionName}/provisionConfig`;
    const provisionConfig = _.get(this.inputs, 'props.provisionConfig', {});
    const qualifier = _.get(provisionConfig, 'qualifier', 'LATEST');
    if (!_.isEmpty(localConfig)) {
      if (this.needDeploy) {
        await this.fcSdk.putFunctionProvisionConfig(this.functionName, qualifier, localConfig);
        const { defaultTarget, target } = localConfig;
        let realTarget = defaultTarget;
        if (!defaultTarget) {
          realTarget = target;
        }
        let getCurrentErrorCount = 0;
        if (realTarget && realTarget > 0) {
          const maxRetries = 180;
          for (let index = 0; index < maxRetries; index++) {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.fcSdk.getFunctionProvisionConfig(
              this.functionName,
              qualifier,
            );
            const { current, currentError } = result || {};
            if (current && current === realTarget) {
              break;
            }
            if (currentError && currentError.length > 0) {
              /*
              logger.warn('=========== LAST 10 MINUTES LOGS START ==========');
              const iInput = _.cloneDeep(this.inputs);
              iInput.args = [
                '--start-time',
                (new Date().getTime() - 10 * 60 * 1000).toString(),
                '--end-time',
                new Date().getTime().toString(),
              ];
              const logs = new Logs(iInput);
              // eslint-disable-next-line no-await-in-loop
              await logs.run();
              logger.warn('=========== LAST 10 MINUTES END =========== ');
              */
              getCurrentErrorCount++;
              if (getCurrentErrorCount > 3 || (index > 6 && getCurrentErrorCount > 0)) {
                throw new Error(
                  `get ${this.functionName}/${qualifier} provision config error: ${currentError}`,
                );
              }
            }
            logger.info(
              `waiting ${this.functionName}/${qualifier} provision OK: current: ${current}, target: ${realTarget}`,
            );
            // eslint-disable-next-line no-await-in-loop
            await sleep(5);
          }
        }
      } else if (_.isEmpty(remoteConfig)) {
        // 如果不需要部署，但是远端资源不存在，则尝试创建一下
        logger.debug(
          `Online provisionConfig does not exist, specified not to deploy, attempting to create ${id}`,
        );
        await this.fcSdk.putFunctionProvisionConfig(this.functionName, qualifier, localConfig);
      } else {
        logger.debug(
          `Online provisionConfig exists, specified not to deploy, skipping deployment ${id}`,
        );
      }
    } else {
      try {
        if (!_.isEmpty(this.remote)) {
          logger.info(`Remove remote provisionConfig of  ${this.functionName}/${qualifier}`);
          await this.fcSdk.removeFunctionProvisionConfig(this.functionName, qualifier);
          for (let index = 0; index < 12; index++) {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.fcSdk.getFunctionProvisionConfig(
              this.functionName,
              qualifier,
            );
            const { current } = result || {};
            if (current === 0 || !current) {
              break;
            }
            logger.info(`waiting ${this.functionName}/${qualifier} provision current to 0 ...`);
            // eslint-disable-next-line no-await-in-loop
            await sleep(5);
          }
        }
      } catch (ex) {
        logger.error(
          `Remove remote provisionConfig of  ${this.functionName}/${qualifier} error: ${ex.message}`,
        );
      }
    }
    return this.needDeploy;
  }

  private async getRemote() {
    const provisionConfig = _.get(this.inputs, 'props.provisionConfig', {});
    const qualifier = _.get(provisionConfig, 'qualifier', 'LATEST');
    try {
      const result = await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier);
      let r = _.omit(result, ['current', 'functionArn', 'currentError']);
      if ('target' in r && 'defaultTarget' in r) {
        r = _.omit(r, ['target']);
      }
      if (_.isEmpty(r?.targetTrackingPolicies)) {
        r = _.omit(r, ['targetTrackingPolicies']);
      }
      if (_.isEmpty(r?.scheduledActions)) {
        r = _.omit(r, ['scheduledActions']);
      }
      this.remote = r;
    } catch (ex) {
      logger.debug(`Get remote provisionConfig of  ${this.functionName} error: ${ex.message}`);
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
    logger.write(`provisionConfig was changed, please confirm before deployment:\n`);
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
