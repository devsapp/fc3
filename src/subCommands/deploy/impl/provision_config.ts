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
  ProvisionMode: string;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const provisionConfig = _.get(inputs, 'props.provisionConfig', {});
    this.local = _.cloneDeep(provisionConfig);

    this.ProvisionMode = _.get(this.local, 'mode', 'sync');
    _.unset(this.local, 'mode');
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

        if (this.ProvisionMode === 'sync') {
          await this.waitForProvisionReady(qualifier, localConfig);
        } else {
          logger.info(
            `Skip wait provisionConfig of ${this.functionName}/${qualifier} to instance up`,
          );
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
    } else if (this.needDeploy) {
      await this.removeProvisionConfig(qualifier);
    }

    return this.needDeploy;
  }

  /**
   * 等待预配置实例就绪
   */
  private async waitForProvisionReady(qualifier: string, config: any) {
    logger.info(
      `Waiting for provisionConfig of ${this.functionName}/${qualifier} to instance up ...`,
    );

    const { defaultTarget, target } = config;
    const realTarget = defaultTarget || target;

    // 如果没有目标值或目标值为0，则无需等待
    if (!realTarget || realTarget <= 0) {
      return;
    }

    let getCurrentErrorCount = 0;
    const maxRetries = 180;

    for (let index = 0; index < maxRetries; index++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier);
      const { current, currentError } = result || {};

      // 检查是否已达到目标值
      if (current && current === realTarget) {
        logger.info(
          `ProvisionConfig of ${this.functionName}/${qualifier} is ready. Current: ${current}, Target: ${realTarget}`,
        );
        return;
      }

      // 处理错误情况
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
        // 如果是系统内部错误，则继续尝试
        if (!currentError.includes('an internal error has occurred')) {
          // 不是系统内部错误，满足一定的重试次数则退出
          getCurrentErrorCount++;
          if (getCurrentErrorCount > 3 || (index > 6 && getCurrentErrorCount > 0)) {
            logger.error(
              `get ${this.functionName}/${qualifier} provision config getCurrentErrorCount=${getCurrentErrorCount}`,
            );
            throw new Error(
              `get ${this.functionName}/${qualifier} provision config error: ${currentError}`,
            );
          }
        }
      }

      logger.info(
        `waiting ${this.functionName}/${qualifier} provision OK: current: ${current}, target: ${realTarget}`,
      );

      // eslint-disable-next-line no-await-in-loop
      await sleep(5);
    }

    logger.warn(
      `Timeout waiting for provisionConfig of ${this.functionName}/${qualifier} to be ready`,
    );
  }

  /**
   * 删除预配置
   */
  private async removeProvisionConfig(qualifier: string) {
    try {
      if (!_.isEmpty(this.remote)) {
        logger.info(`Remove remote provisionConfig of ${this.functionName}/${qualifier}`);
        await this.fcSdk.removeFunctionProvisionConfig(this.functionName, qualifier);

        // 等待预配置实例数降至0
        const maxRetries = 12;
        for (let index = 0; index < maxRetries; index++) {
          // eslint-disable-next-line no-await-in-loop
          const result = await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier);
          const { current } = result || {};

          if (current === 0 || !current) {
            logger.info(
              `ProvisionConfig of ${this.functionName}/${qualifier} removed successfully`,
            );
            return;
          }

          logger.info(`waiting ${this.functionName}/${qualifier} provision current to 0 ...`);
          // eslint-disable-next-line no-await-in-loop
          await sleep(5);
        }

        logger.warn(
          `Timeout waiting for provisionConfig of ${this.functionName}/${qualifier} to be removed`,
        );
      }
    } catch (ex) {
      logger.error(
        `Remove remote provisionConfig of ${this.functionName}/${qualifier} error: ${ex.message}`,
      );
      throw ex;
    }
  }

  /**
   * 清理预配置配置对象
   */
  private sanitizeProvisionConfig(config: any): any {
    if (!config) return {};

    let sanitized = _.omit(config, ['current', 'functionArn', 'currentError']);

    // 如果同时存在target和defaultTarget，移除target
    if ('target' in sanitized && 'defaultTarget' in sanitized) {
      sanitized = _.omit(sanitized, ['target']);
    }

    // 移除空的策略配置
    if (_.isEmpty(sanitized?.targetTrackingPolicies)) {
      sanitized = _.omit(sanitized, ['targetTrackingPolicies']);
    }

    if (_.isEmpty(sanitized?.scheduledActions)) {
      sanitized = _.omit(sanitized, ['scheduledActions']);
    }

    return sanitized;
  }

  private async getRemote() {
    const provisionConfig = _.get(this.inputs, 'props.provisionConfig', {});
    const qualifier = _.get(provisionConfig, 'qualifier', 'LATEST');

    try {
      const result = await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier);
      this.remote = this.sanitizeProvisionConfig(result);
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
