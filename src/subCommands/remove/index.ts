import _ from 'lodash';
import { IInputs, RegionList } from '../../interface';
import chalk from 'chalk';
import logger from '../../logger';
import FC from '../../resources/fc';
import { FC_API_ERROR_CODE } from '../../resources/fc/error-code';
import { parseArgv } from '@serverless-devs/utils';
import { promptForConfirmOrDetails, sleep } from '../../utils';

export default class Remove {
  private functionName: string;
  private yes: boolean = false;
  private resources: Record<string, any> = {};

  private fcSdk: FC;

  constructor(inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['function'],
    });
    logger.debug(`parse argv: ${JSON.stringify(opts)}`);

    const { function: needRemoveFunction, trigger, 'assume-yes': yes } = opts;

    const removeAll = !needRemoveFunction && !trigger;

    const region = inputs.props.region;
    if (!_.includes(RegionList, region)) {
      throw new Error(`Invalid region: ${region}`);
    }
    this.functionName = inputs.props.function?.functionName;

    if (removeAll || needRemoveFunction === true) {
      this.resources.function = this.functionName;
    }

    if (_.isString(trigger)) {
      this.resources.triggerNames = trigger.split(',');
    } else if (removeAll || trigger === true) {
      this.resources.triggerNames = inputs.props.triggers?.map((item) => item.triggerName);
    }

    if (
      (!_.isEmpty(this.resources.triggerNames) || this.resources.function) &&
      !this.functionName
    ) {
      throw new Error('Function name not specified');
    }

    logger.debug(`region ${region}`);
    logger.debug(`function ${this.functionName}, needRemoveFunction: ${this.resources.function}`);
    logger.debug(`Appoint triggers ${this.resources.triggerNames}`);

    this.yes = yes;
    this.fcSdk = new FC(region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });
  }

  private async computingRemoveResource() {
    if (this.resources.function) {
      logger.spin('getting', 'function resource', this.functionName);
      await this.getFunctionResource();
      logger.spin('got', 'function resource', this.functionName);
    }

    if (this.resources.function || !_.isEmpty(this.resources.triggerNames)) {
      logger.spin('getting', 'trigger', this.functionName);
      await this.getTriggerResource();
      logger.spin('got', 'trigger', this.functionName);
    }
  }

  async run() {
    await this.computingRemoveResource();

    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        'Are you sure you want to delete the resources listed above',
      );
      if (!y) {
        logger.debug('False is selected. Skip remove');
        return;
      }
    }
    await this.removeTrigger();
    await this.removeFunction();
  }

  private async getFunctionResource() {
    try {
      await this.fcSdk.getFunction(this.functionName);
      logger.write(`Remove function: ${this.functionName}`);
      console.log();
    } catch (ex) {
      logger.debug(`Remove function check error: ${ex.message}`);
      if (ex.code === FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug('Function not found, skipping remove.');
        // 如果是 404，跳过删除
        this.resources.function = undefined;
        return;
      }
    }

    try {
      const provision = await this.fcSdk.listFunctionProvisionConfig(this.functionName);
      this.resources.provision = provision.map((item) => {
        const qualifier = _.findLast(item.functionArn.split('/'));
        return {
          qualifier,
          current: item.current,
          target: item.target,
        };
      });
      logger.write(`Remove function ${this.functionName} provision:`);
      logger.output(this.resources.provision, 2);
      console.log();
    } catch (ex) {
      logger.debug(`List function ${this.functionName} provision error: ${ex.message}`);
    }

    try {
      const concurrency = await this.fcSdk.getFunctionConcurrency(this.functionName);
      this.resources.concurrency = concurrency.reservedConcurrency;
      logger.write(
        `Remove function ${this.functionName} concurrency: ${this.resources.concurrency}`,
      );
      console.log();
    } catch (ex) {
      logger.debug(`Get function ${this.functionName} concurrency error: ${ex.message}`);
    }

    try {
      const aliases = await this.fcSdk.listAlias(this.functionName);
      if (!_.isEmpty(aliases)) {
        this.resources.aliases = aliases.map((item) => item.aliasName);
        logger.write(`Remove function ${this.functionName} aliases:`);
        logger.output(this.resources.aliases, 2);
        console.log();
      }
    } catch (ex) {
      logger.debug(`List function ${this.functionName} aliases error: ${ex.message}`);
    }

    try {
      const versions = await this.fcSdk.listFunctionVersion(this.functionName);
      if (!_.isEmpty(versions)) {
        this.resources.versions = versions.map((item) => item.versionId);
        if (versions.length > 5) {
          logger.write(
            `${chalk.yellow(versions.length)} versions of function ${
              this.functionName
            } need to be deleted`,
          );
        } else {
          logger.write(`Remove function ${this.functionName} versions:`);
          logger.output(this.resources.versions, 2);
        }
        console.log();
      }
    } catch (ex) {
      logger.debug(`List function ${this.functionName} versions error: ${ex.message}`);
    }
  }

  private async getTriggerResource() {
    let triggers = [];
    try {
      triggers = await this.fcSdk.listTriggers(this.functionName);
    } catch (ex) {
      logger.debug(`List function ${this.functionName} triggers error: ${ex.message}`);
    }

    // 认为指定删除 triggerNames
    if (!this.resources.function && !_.isEmpty(this.resources.triggerNames)) {
      const triggerNames = this.resources.triggerNames;
      triggers = _.filter(triggers, (item) => triggerNames.includes(item.triggerName));
    }

    if (_.isEmpty(triggers)) {
      this.resources.triggerNames = [];
    } else {
      logger.write(`Remove function ${this.functionName} triggers:`);
      logger.output(
        triggers.map((item) => ({
          triggerName: item.triggerName,
          triggerType: item.triggerType,
          qualifier: item.qualifier,
        })),
        2,
      );
      console.log();

      this.resources.triggerNames = triggers.map((item) => item.triggerName);
    }
  }

  private async removeTrigger() {
    if (_.isEmpty(this.resources.triggerNames)) {
      return;
    }
    for (const triggerName of this.resources.triggerNames) {
      logger.spin('removing', 'trigger', `${this.functionName}/${triggerName}`);
      try {
        await this.fcSdk.removeTrigger(this.functionName, triggerName);
      } catch (ex) {
        throw ex;
      }
      logger.spin('removed', 'trigger', `${this.functionName}/${triggerName}`);
    }
  }

  async removeFunction() {
    // 删除资源顺序
    // {
    //   provision: [ { qualifier: 'test', current: 2, target: 2 } ], // target / current
    //   concurrency: 80,
    //   aliases: [ 'test' ],
    //   versions: [ '2', '1' ]
    //   function: 'fc3-event-nodejs14',
    // }
    if (!this.resources.function) {
      return;
    }

    if (!_.isEmpty(this.resources.provision)) {
      for (const { qualifier } of this.resources.provision) {
        logger.spin('removing', 'function provision', `${this.functionName}/${qualifier}`);
        await this.fcSdk.removeFunctionProvisionConfig(this.functionName, qualifier);
        logger.spin('removed', 'function provision', `${this.functionName}/${qualifier}`);
      }
    }

    if (this.resources.concurrency) {
      logger.spin('removing', 'function concurrency', this.functionName);
      await this.fcSdk.removeFunctionConcurrency(this.functionName);
      logger.spin('removed', 'function concurrency', this.functionName);
    }

    if (!_.isEmpty(this.resources.provision)) {
      for (const { qualifier } of this.resources.provision) {
        logger.spin('checking', 'remove function provision', `${this.functionName}/${qualifier}`);
        while (true) {
          await sleep(1.5);
          const { current } =
            (await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier)) || {};
          if (current === 0 || !current) {
            logger.spin(
              'checked',
              'remove function provision',
              `${this.functionName}/${qualifier}`,
            );
            break;
          }
        }
      }
    }

    if (!_.isEmpty(this.resources.aliases)) {
      for (const alias of this.resources.aliases) {
        logger.spin('removing', 'function alias', `${this.functionName}/${alias}`);
        await this.fcSdk.removeAlias(this.functionName, alias);
        logger.spin('removed', 'function alias', `${this.functionName}/${alias}`);
      }
    }

    if (!_.isEmpty(this.resources.versions)) {
      for (const version of this.resources.versions) {
        logger.spin('removing', 'function version', `${this.functionName}/${version}`);
        await this.fcSdk.removeFunctionVersion(this.functionName, version);
        logger.spin('removed', 'function version', `${this.functionName}/${version}`);
      }
    }

    logger.spin('removing', 'function', this.functionName);
    await this.fcSdk.fc20230330Client.deleteFunction(this.functionName);
    logger.spin('removed', 'function', this.functionName);
  }
}
