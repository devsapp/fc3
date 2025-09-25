import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Base from './base';
import { sleep, isProvisionConfigError } from '../../../utils';

interface IOpts {
  yes: boolean | undefined;
}

export default class ScalingConfig extends Base {
  local: any;
  remote: any;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const scalingConfig = _.get(inputs, 'props.scalingConfig', {});
    this.local = _.cloneDeep(scalingConfig);

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
        try {
          await this.fcSdk.putFunctionScalingConfig(this.functionName, qualifier, localConfig);
        } catch (err) {
          if (!isProvisionConfigError(err)) {
            throw err; // Re-throw non-provision config errors
          }

          logger.warn(
            'ScalingConfig: Reserved resource pool instances and elastic instances cannot be directly switched; \ntrying to delete existing scalingConfig, then create a new scalingConfig...',
          );

          await this.removeScalingConfig(qualifier);

          const maxRetries = 60;
          const retryDelay = 2;

          for (let i = 0; i < maxRetries; i++) {
            try {
              // eslint-disable-next-line no-await-in-loop
              await this.fcSdk.putFunctionScalingConfig(this.functionName, qualifier, localConfig);
              logger.info('Successfully created scalingConfig after retry');
              return this.needDeploy;
            } catch (err2) {
              if (!isProvisionConfigError(err2)) {
                throw err2; // Re-throw non-provision config errors
              }

              if (i < maxRetries - 1) {
                logger.info(
                  `Retry ${i + 1}/${maxRetries}: putFunctionScalingConfig failed, retrying...`,
                );
                // eslint-disable-next-line no-await-in-loop
                await sleep(retryDelay);
              }
            }
          }
          throw new Error(`Failed to create scalingConfig after ${maxRetries} attempts`);
        }
        await this.waitForScalingReady(qualifier, localConfig);
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
      return;
    }

    const maxRetries = 180;

    for (let index = 0; index < maxRetries; index++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.fcSdk.getFunctionScalingConfig(this.functionName, qualifier);
      const { currentInstances } = result || {};

      // 检查是否已达到最小实例数
      if (currentInstances && currentInstances >= result.minInstances) {
        logger.info(
          `ScalingConfig of ${this.functionName}/${qualifier} is ready. CurrentInstances: ${currentInstances}, MinInstances: ${minInstances}`,
        );
        return;
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
        logger.info(`Remove remote scalingConfig of ${this.functionName}/${qualifier}`);
        await this.fcSdk.removeFunctionScalingConfig(this.functionName, qualifier);

        // 等待弹性配置实例数降至0
        const maxRetries = 12;
        for (let index = 0; index < maxRetries; index++) {
          // eslint-disable-next-line no-await-in-loop
          const result = await this.fcSdk.getFunctionScalingConfig(this.functionName, qualifier);
          const { currentInstances } = result || {};

          if (!currentInstances || currentInstances === 0) {
            logger.info(`ScalingConfig of ${this.functionName}/${qualifier} removed successfully`);
            return;
          }

          logger.info(
            `waiting ${this.functionName}/${qualifier} scaling currentInstances to 0 ...`,
          );
          // eslint-disable-next-line no-await-in-loop
          await sleep(5);
        }

        logger.warn(
          `Timeout waiting for scalingConfig of ${this.functionName}/${qualifier} to be removed`,
        );
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
