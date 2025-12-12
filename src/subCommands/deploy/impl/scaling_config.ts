import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Base from './base';
import { sleep } from '../../../utils';
import { provisionConfigErrorRetry, removeScalingConfigSDK } from '../utils';

interface IOpts {
  yes: boolean | undefined;
}

export default class ScalingConfig extends Base {
  local: any;
  remote: any;
  readonly functionName: string;
  ScalingMode: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const scalingConfig = _.get(inputs, 'props.scalingConfig', {});
    this.local = _.cloneDeep(scalingConfig);
    this.ScalingMode = _.get(this.local, 'mode', 'sync');
    _.unset(this.local, 'mode');
    logger.debug(`need deploy scalingConfig: ${JSON.stringify(scalingConfig)}`);
  }

  async before() {
    await this.getRemote();

    await this.plan();
  }

  async run() {
    const remoteConfig = this.remote || {};
    const localConfig = this.local;

    const id = `${this.functionName}/scalingConfig`;
    const scalingConfig = _.get(this.inputs, 'props.scalingConfig', {});
    const qualifier = _.get(scalingConfig, 'qualifier', 'LATEST');

    if (!_.isEmpty(localConfig)) {
      if (this.needDeploy) {
        await provisionConfigErrorRetry(
          this.fcSdk,
          'ScalingConfig',
          this.functionName,
          qualifier,
          localConfig,
        );

        if (this.ScalingMode === 'sync' || this.ScalingMode === 'drain') {
          await this.waitForScalingReady(qualifier, localConfig);
        } else {
          logger.info(
            `Skip wait scalingConfig of ${this.functionName}/${qualifier} to instance up`,
          );
        }
      } else if (_.isEmpty(remoteConfig)) {
        // 如果不需要部署，但是远端资源不存在，则尝试创建一下
        logger.debug(
          `Online scalingConfig does not exist, specified not to deploy, attempting to create ${id}`,
        );
        await this.fcSdk.putFunctionScalingConfig(this.functionName, qualifier, localConfig);
      } else {
        logger.debug(
          `Online scalingConfig exists, specified not to deploy, skipping deployment ${id}`,
        );
      }
    } else if (this.needDeploy) {
      await this.removeScalingConfig(qualifier);
    }

    return this.needDeploy;
  }

  /**
   * 等待弹性配置实例就绪
   */
  private async waitForScalingReady(qualifier: string, config: any) {
    logger.info(
      `Waiting for scalingConfig of ${this.functionName}/${qualifier} to instance up ...`,
    );

    const { minInstances } = config;

    // 如果没有最小实例数或最小实例数为0，则无需等待
    if (!minInstances || minInstances <= 0) {
      if (this.ScalingMode !== 'drain') {
        return;
      } else {
        logger.info(`disableFunctionInvocation ${this.functionName} ...`);
        await this.fcSdk.disableFunctionInvocation(this.functionName, true, 'Fast scale-to-zero');
        await sleep(5);
        logger.info(`enableFunctionInvocation ${this.functionName} ...`);
        await this.fcSdk.enableFunctionInvocation(this.functionName);
        return;
      }
    }

    let getCurrentErrorCount = 0;
    const maxRetries = 180;

    for (let index = 0; index < maxRetries; index++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.fcSdk.getFunctionScalingConfig(this.functionName, qualifier);
      const { currentInstances, currentError } = result || {};

      // 检查是否已达到最小实例数
      if (currentInstances && currentInstances >= result.minInstances) {
        logger.info(
          `ScalingConfig of ${this.functionName}/${qualifier} is ready. CurrentInstances: ${currentInstances}, MinInstances: ${minInstances}`,
        );
        return;
      }
      if (currentError && currentError.length > 0) {
        // 如果是系统内部错误，则继续尝试
        if (!currentError.includes('an internal error has occurred')) {
          // 不是系统内部错误，满足一定的重试次数则退出
          getCurrentErrorCount++;
          if (getCurrentErrorCount > 3 || (index > 6 && getCurrentErrorCount > 0)) {
            logger.error(
              `get ${this.functionName}/${qualifier} scaling config getCurrentErrorCount=${getCurrentErrorCount}`,
            );
            throw new Error(
              `get ${this.functionName}/${qualifier} scaling config error: ${currentError}`,
            );
          }
        }
      }

      logger.info(
        `waiting ${this.functionName}/${qualifier} scaling OK: currentInstances: ${currentInstances}, minInstances: ${minInstances}`,
      );

      // eslint-disable-next-line no-await-in-loop
      await sleep(5);
    }

    logger.warn(
      `Timeout waiting for scalingConfig of ${this.functionName}/${qualifier} to be ready`,
    );
  }

  /**
   * 删除弹性配置
   */
  private async removeScalingConfig(qualifier: string) {
    try {
      if (!_.isEmpty(this.remote)) {
        await removeScalingConfigSDK(this.fcSdk, this.functionName, qualifier);
      }
    } catch (ex) {
      logger.error(
        `Remove remote scalingConfig of ${this.functionName}/${qualifier} error: ${ex.message}`,
      );
      throw ex;
    }
  }

  /**
   * 清理弹性配置对象
   */
  private sanitizeScalingConfig(config: any): any {
    if (!config) return {};

    return _.omit(config, ['currentInstances', 'currentError', 'functionArn', 'targetInstances']);
  }

  private async getRemote() {
    const scalingConfig = _.get(this.inputs, 'props.scalingConfig', {});
    const qualifier = _.get(scalingConfig, 'qualifier', 'LATEST');

    try {
      const result = await this.fcSdk.getFunctionScalingConfig(this.functionName, qualifier);
      this.remote = this.sanitizeScalingConfig(result);
    } catch (ex) {
      logger.debug(`Get remote scalingConfig of  ${this.functionName} error: ${ex.message}`);
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
    logger.write(`scalingConfig was changed, please confirm before deployment:\n`);
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
