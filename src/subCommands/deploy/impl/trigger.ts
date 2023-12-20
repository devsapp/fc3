/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import inquirer from 'inquirer';
import { diffConvertYaml } from '@serverless-devs/diff';

import { IInputs, ITrigger } from '../../../interface';
import logger from '../../../logger';
import Base from './base';
import { GetApiType } from '../../../resources/fc';
import { FC_API_ERROR_CODE } from '../../../resources/fc/error-code';
import { FC_TRIGGER_DEFAULT_CONFIG } from '../../../default/config';

interface IOpts {
  yes: boolean | undefined;
  trigger: boolean | string | undefined;
}

export default class Trigger extends Base {
  local: ITrigger[] = [];
  remote: any[] = [];
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const local = _.cloneDeep(_.get(inputs, 'props.triggers', []));
    const triggerNames = local.map((item) => item.triggerName);

    logger.debug(local);

    // 如果指定了 trigger 为字符串，则认为指定了 trigger name
    if (_.isString(opts.trigger) && opts.trigger !== '') {
      const onlyDeployTrigger = opts.trigger.split(',');
      // 判断指定的配置是否存在参数中
      const difference = _.difference(onlyDeployTrigger, triggerNames);
      if (!_.isEmpty(difference)) {
        logger.error(`Trigger names '${difference.join("','")}' are not allowed in trigger config`);
      }

      // 仅保留yaml中配置的参数
      const intersection = _.intersection(triggerNames, onlyDeployTrigger);
      logger.debug(`need deploy trigger names: ${intersection}`);
      this.local = _.filter(local, (item) => intersection.includes(item.triggerName));
    } else {
      this.local = local;
    }

    this.local = this.local.map((item) => _.defaults(item, FC_TRIGGER_DEFAULT_CONFIG));
    logger.debug(`need deploy trigger: ${JSON.stringify(this.local)}`);
  }

  async before() {
    await this._getRemote();

    await this._plan();
  }

  async run() {
    for (let index = 0; index < this.local.length; index++) {
      const remoteConfig = this.remote[index] || {};
      const localConfig = this.local[index];

      const id = `${this.functionName}/${localConfig.triggerName}`;
      if (this.needDeploy) {
        await this.fcSdk.deployTrigger(this.functionName, localConfig);
      } else if (_.isEmpty(remoteConfig)) {
        // 如果不需要部署，但是远端资源不存在，则尝试创建一下
        logger.debug(
          `Online configuration does not exist, specified not to deploy, attempting to create ${id}`,
        );
        try {
          await this.fcSdk.createTrigger(this.functionName, localConfig);
        } catch (ex) {
          logger.debug(`Create trigger error: ${ex.message}`);
          if (ex.code !== FC_API_ERROR_CODE.FunctionAlreadyExists) {
            throw ex;
          }
        }
      } else {
        logger.debug(
          `Online configuration exists, specified not to deploy, skipping deployment ${id}`,
        );
      }
    }
    return this.needDeploy;
  }

  private async _getRemote() {
    for (const config of this.local) {
      const { triggerName } = config;
      try {
        const result = await this.fcSdk.getTrigger(
          this.functionName,
          triggerName,
          GetApiType.simpleUnsupported,
        );
        this.remote.push(result);
        continue;
      } catch (ex) {
        logger.debug(
          `Get remote trigger(${this.functionName}/${triggerName}) config error: ${ex.message}`,
        );
      }
      this.remote.push({});
    }
  }

  private async _plan() {
    const diff: string[] = [];
    for (let index = 0; index < this.local.length; index++) {
      const remoteConfig = this.remote[index] || {};
      if (_.isEmpty(remoteConfig)) {
        continue;
      }
      const localConfig = this.local[index];
      const { diffResult, show } = diffConvertYaml(remoteConfig, localConfig);
      logger.debug(`${this.functionName}/${localConfig.triggerName} diff show:\n${show}`);
      if (!_.isEmpty(diffResult)) {
        diff.push(`${this.functionName}/${localConfig.triggerName} \n${show}`);
      }
    }

    // 没有差异，直接部署
    if (_.isEmpty(diff)) {
      this.needDeploy = true;
      return;
    }
    logger.write(`Triggers was changed, please confirm before deployment:\n`);
    logger.write(diff.join('\n'));

    // 用户指定了 --yes 或者 --no-yes，不再交互
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
