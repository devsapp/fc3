/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import { IInputs, IRegion, checkRegion } from '../../interface';
import chalk from 'chalk';
import logger from '../../logger';
import FC, { GetApiType } from '../../resources/fc';
import { FC_API_ERROR_CODE } from '../../resources/fc/error-code';
import { parseArgv } from '@serverless-devs/utils';
import { promptForConfirmOrDetails, sleep, transformCustomDomainProps } from '../../utils';
import loadComponent from '@serverless-devs/load-component';
import { IInputs as _IInputs } from '@serverless-devs/component-interface';
import { FC3_DOMAIN_COMPONENT_NAME } from '../../constant';
import { DisableFunctionInvocationRequest } from '@alicloud/fc20230330';

export default class Remove {
  private region: IRegion;
  private functionName: string;
  private yes = false;
  private async_invoke_config: boolean;
  private resources: Record<string, any> = {};
  private disable_list_remote_eb_triggers: string;
  private disable_list_remote_alb_triggers: string;

  private fcSdk: FC;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['function', 'async_invoke_config'],
      string: [
        'function-name',
        'region',
        'disable-list-remote-eb-triggers',
        'disable-list-remote-alb-triggers',
      ],
    });
    logger.debug(`parse argv: ${JSON.stringify(opts)}`);

    const {
      region,
      function: needRemoveFunction,
      trigger,
      'assume-yes': yes,
      'function-name': functionName,
      'async-invoke-config': async_invoke_config,
      'disable-list-remote-eb-triggers': disable_list_remote_eb_triggers,
      'disable-list-remote-alb-triggers': disable_list_remote_alb_triggers,
    } = opts;

    const removeAll = !needRemoveFunction && !trigger && !async_invoke_config;
    this.async_invoke_config = async_invoke_config;
    this.disable_list_remote_eb_triggers = disable_list_remote_eb_triggers;
    this.disable_list_remote_alb_triggers = disable_list_remote_alb_triggers;

    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    if (!this.functionName) {
      // throw new Error('Function name not specified, please specify --function-name');
      logger.error('Function name not specified, please specify --function-name');
      this.functionName = 'undefined_placeholder_not_exist_123456789';
    }

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

    logger.debug(`region ${this.region}`);
    logger.debug(`function ${this.functionName}, needRemoveFunction: ${this.resources.function}`);
    logger.debug(`Appoint triggers ${this.resources.triggerNames}`);

    this.yes = !!yes;
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:remove`,
    });
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
    try {
      await this.removeAsyncInvokeConfig();
      await this.removeCustomDomain();
      await this.removeTrigger();
      await this.removeFunction();
    } catch (ex) {
      logger.error(`remove error: ${ex.message}`);
    }
  }

  private async computingRemoveResource() {
    if (this.resources.function) {
      logger.spin('getting', 'function resource', `${this.region}/${this.functionName}`);
      await this.getFunctionResource();
      logger.spin('got', 'function resource', `${this.region}/${this.functionName}`);
    }

    if (this.resources.function || !_.isEmpty(this.resources.triggerNames)) {
      logger.spin('getting', 'trigger', `${this.region}/${this.functionName}`);
      await this.getTriggerResource();
      logger.spin('got', 'trigger', `${this.region}/${this.functionName}`);
    }

    if (this.resources.function || this.async_invoke_config) {
      logger.spin('getting', 'asyncInvokeConfig', `${this.region}/${this.functionName}`);
      await this.getAsyncInvokeConfigResource();
      logger.spin('got', 'asyncInvokeConfig', `${this.region}/${this.functionName}`);
    }
  }

  private async getFunctionResource() {
    try {
      await this.fcSdk.getFunction(this.functionName);
      logger.write(`Remove function: ${this.region}/${this.functionName}`);
      console.log();
    } catch (ex) {
      logger.debug(
        `Remove function ${this.region}/${this.functionName} check error: ${ex.message}`,
      );
      if (ex.code === FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug('Function not found, skipping remove.');
        // 如果是 404，跳过删除
        this.resources.function = undefined;
        return;
      }
    }

    try {
      const vpcBindingConfigs = await this.fcSdk.getVpcBinding(
        this.functionName,
        GetApiType.simpleUnsupported,
      );
      if (
        vpcBindingConfigs &&
        Array.isArray(vpcBindingConfigs.vpcIds) &&
        vpcBindingConfigs.vpcIds.length > 0
      ) {
        this.resources.vpcBindingConfigs = vpcBindingConfigs;
        logger.write(`Remove function ${this.region}/${this.functionName} vpcBinding:`);
        logger.output(this.resources.vpcBindingConfigs, 2);
        console.log();
      }
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName} vpcBinding error: ${ex.message}`,
      );
    }

    try {
      const provision = await this.fcSdk.listFunctionProvisionConfig(this.functionName);
      this.resources.provision = provision.map((item) => {
        const li = item.functionArn.split('/');
        let qualifier = 'LATEST';
        if (li.length > 2) {
          qualifier = _.findLast(item.functionArn.split('/'));
        }
        return {
          qualifier,
          current: item.current,
          target: item.target,
        };
      });
      logger.write(`Remove function ${this.region}/${this.functionName} provision:`);
      logger.output(this.resources.provision, 2);
      console.log();
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName}provision error: ${ex.message}`,
      );
    }

    try {
      const concurrency = await this.fcSdk.getFunctionConcurrency(this.functionName);
      this.resources.concurrency = concurrency.reservedConcurrency;
      logger.write(
        `Remove function ${this.region}/${this.functionName} concurrency: ${this.resources.concurrency}`,
      );
      console.log();
    } catch (ex) {
      logger.debug(
        `Get function ${this.region}/${this.functionName} concurrency error: ${ex.message}`,
      );
    }

    try {
      const aliases = await this.fcSdk.listAlias(this.functionName);
      if (!_.isEmpty(aliases)) {
        this.resources.aliases = aliases.map((item) => item.aliasName);
        logger.write(`Remove function ${this.region}/${this.functionName} aliases:`);
        logger.output(this.resources.aliases, 2);
        console.log();
      }
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName} aliases error: ${ex.message}`,
      );
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
          logger.write(`Remove function ${this.region}/${this.functionName} versions:`);
          logger.output(this.resources.versions, 2);
        }
        console.log();
      }
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName} versions error: ${ex.message}`,
      );
    }
  }

  private async getAsyncInvokeConfigResource() {
    try {
      const asyncInvokeConfigs = await this.fcSdk.listAsyncInvokeConfig(this.functionName);
      if (!_.isEmpty(asyncInvokeConfigs)) {
        this.resources.asyncInvokeConfigs = asyncInvokeConfigs.map((item) => ({
          functionArn: item.functionArn,
          // acs:fc:cn-huhehaote:123456:functions/fc3-command-fc3-command/test
          // acs:fc:cn-huhehaote:123456:functions/fc3-command-fc3-command
          qualifier: item.functionArn.split('/')[2] || 'LATEST',
          destinationConfig: item.destinationConfig,
        }));
        logger.write(`Remove function ${this.region}/${this.functionName} asyncInvokeConfigs:`);
        logger.output(this.resources.asyncInvokeConfigs, 2);
        console.log();
      }
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName} asyncInvokeConfigs error: ${ex.message}`,
      );
    }
  }

  private async getTriggerResource() {
    let triggers = [];
    try {
      triggers = await this.fcSdk.listTriggers(
        this.functionName,
        this.disable_list_remote_eb_triggers,
        this.disable_list_remote_alb_triggers,
      );
    } catch (ex) {
      logger.debug(
        `List function ${this.region}/${this.functionName} triggers error: ${ex.message}`,
      );
    }

    // 认为指定删除 triggerNames
    if (!this.resources.function && !_.isEmpty(this.resources.triggerNames)) {
      const { triggerNames } = this.resources;
      triggers = _.filter(triggers, (item) => triggerNames.includes(item.triggerName));
    }

    if (_.isEmpty(triggers)) {
      this.resources.triggerNames = [];
    } else {
      logger.write(`Remove function ${this.region}/${this.functionName} triggers:`);
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
      logger.spin('removing', 'trigger', `${this.region}/${this.functionName}/${triggerName}`);
      try {
        await this.fcSdk.removeTrigger(this.functionName, triggerName);
      } catch (ex) {
        logger.error(`${ex}`);
      }
      logger.spin('removed', 'trigger', `${this.region}/${this.functionName}/${triggerName}`);
    }
  }

  private async removeAsyncInvokeConfig() {
    if (_.isEmpty(this.resources.asyncInvokeConfigs)) {
      return;
    }

    for (const { qualifier } of this.resources.asyncInvokeConfigs) {
      logger.spin(
        'removing',
        'function asyncInvokeConfigs',
        `${this.region}/${this.functionName}/${qualifier}`,
      );
      await this.fcSdk.removeAsyncInvokeConfig(this.functionName, qualifier);
      logger.spin(
        'removed',
        'function asyncInvokeConfigs',
        `${this.region}/${this.functionName}/${qualifier}`,
      );
    }
  }

  private async removeFunction() {
    /* 删除资源顺序
      vpcBinding: {}
      provision: [ { qualifier: 'test', current: 2, target: 2 } ], // target / current
      concurrency: 80,
      aliases: [ 'test' ],
      versions: [ '2', '1' ]
      function: 'fc3-event-nodejs18',
    */
    if (!this.resources.function) {
      return;
    }

    if (!_.isEmpty(this.resources.vpcBindingConfigs)) {
      for (const vpcId of this.resources.vpcBindingConfigs.vpcIds) {
        logger.spin(
          'removing',
          'function vpcBinding',
          `${this.region}/${this.functionName}/${vpcId}`,
        );
        await this.fcSdk.deleteVpcBinding(this.functionName, vpcId);
        logger.spin(
          'removed',
          'function vpcBinding',
          `${this.region}/${this.functionName}/${vpcId}`,
        );
      }
    }

    if (!_.isEmpty(this.resources.provision)) {
      for (const { qualifier } of this.resources.provision) {
        logger.spin(
          'removing',
          'function provision',
          `${this.region}/${this.functionName}/${qualifier}`,
        );
        await this.fcSdk.removeFunctionProvisionConfig(this.functionName, qualifier);
        logger.spin(
          'removed',
          'function provision',
          `${this.region}/${this.functionName}/${qualifier}`,
        );
      }
    }

    if (!_.isEmpty(this.resources.provision)) {
      for (const { qualifier } of this.resources.provision) {
        logger.spin(
          'checking',
          'remove function provision',
          `${this.region}/${this.functionName}/${qualifier}`,
        );
        // eslint-disable-next-line no-constant-condition
        while (true) {
          await sleep(1);
          const { current } =
            (await this.fcSdk.getFunctionProvisionConfig(this.functionName, qualifier)) || {};
          if (current === 0 || !current) {
            logger.spin(
              'checked',
              'remove function provision',
              `${this.region}/${this.functionName}/${qualifier}`,
            );
            break;
          }
        }
      }
    }

    if (this.resources.concurrency) {
      logger.spin('removing', 'function concurrency', `${this.region}/${this.functionName}`);
      await this.fcSdk.removeFunctionConcurrency(this.functionName);
      logger.spin('removed', 'function concurrency', `${this.region}/${this.functionName}`);
    }

    if (!_.isEmpty(this.resources.aliases)) {
      for (const alias of this.resources.aliases) {
        logger.spin('removing', 'function alias', `${this.region}/${this.functionName}/${alias}`);
        await this.fcSdk.removeAlias(this.functionName, alias);
        logger.spin('removed', 'function alias', `${this.region}/${this.functionName}/${alias}`);
      }
    }

    if (!_.isEmpty(this.resources.versions)) {
      for (const version of this.resources.versions) {
        logger.spin(
          'removing',
          'function version',
          `${this.region}/${this.functionName}/${version}`,
        );
        await this.fcSdk.removeFunctionVersion(this.functionName, version);
        logger.spin(
          'removed',
          'function version',
          `${this.region}/${this.functionName}/${version}`,
        );
      }
    }

    logger.spin('removing', 'function', `${this.region}/${this.functionName}`);
    try {
      await this.fcSdk.fc20230330Client.deleteFunction(this.functionName);
    } catch (ex) {
      // 如果是 ProvisionConfigExist 错误，尝试重试
      if (ex.code === FC_API_ERROR_CODE.ProvisionConfigExist) {
        logger.warn(
          `Remove function ${this.functionName} failed with ProvisionConfigExist error, retrying...`,
        );

        const retryCount = 25;
        // 重试 20 次，每次间隔 2 秒
        for (let i = 1; i <= retryCount; i++) {
          logger.info(`Retry attempt ${i}/${retryCount}...`);
          await sleep(2);

          try {
            await this.fcSdk.fc20230330Client.deleteFunction(this.functionName);
            logger.info(`Function ${this.functionName} removed successfully on retry attempt ${i}`);
            break;
          } catch (retryEx) {
            if (i === retryCount) {
              // 最后一次重试仍然失败
              logger.error(
                `Remove function ${this.functionName} error after 20 retries: ${retryEx.message}`,
              );
              throw retryEx;
            }

            // 如果不是 ProvisionConfigExist 错误，直接抛出
            if (retryEx.code !== FC_API_ERROR_CODE.ProvisionConfigExist) {
              logger.error(`Remove function ${this.functionName} error: ${retryEx.message}`);
              throw retryEx;
            }

            if (i === 5) {
              logger.warn(
                `Remove function ${this.functionName} error after 5 retries, disable function invocation.`,
              );
              const disableFunctionInvocationRequest = new DisableFunctionInvocationRequest({
                reason: 'functionai-delete',
                abortOngoingRequest: true,
              });
              const res = await this.fcSdk.fc20230330Client.disableFunctionInvocation(
                this.functionName,
                disableFunctionInvocationRequest,
              );
              logger.debug(`DisableFunctionInvocation: ${JSON.stringify(res, null, 2)}`);
            }

            // 如果是 ProvisionConfigExist 错误，继续重试
            logger.warn(
              `Remove function ${this.functionName} still failed with ProvisionConfigExist error, continuing retries...`,
            );
          }
        }
      } else {
        logger.error(`Remove function ${this.functionName} error: ${ex.message}`);
        throw ex;
      }
    }
    logger.spin('removed', 'function', `${this.region}/${this.functionName}`);
  }

  private async removeCustomDomain() {
    const customDomain = _.get(this.inputs.props, 'customDomain', {}) as any;
    if (_.isEmpty(customDomain)) {
      return;
    }
    const local = _.cloneDeep(customDomain) as any;
    const customDomainInputs = _.cloneDeep(this.inputs) as _IInputs;
    let props = { region: this.inputs.props.region } as any;
    if (!_.isEmpty(local)) {
      props = transformCustomDomainProps(local, this.region, this.functionName);
    }
    customDomainInputs.props = props;
    try {
      const domainInstance = await loadComponent(FC3_DOMAIN_COMPONENT_NAME, { logger });
      const onlineCustomDomain = await domainInstance.info(customDomainInputs);
      const routes = onlineCustomDomain?.routeConfig?.routes;
      if (routes) {
        const { domainName } = onlineCustomDomain;
        const myRoute = customDomain.route;
        const qualifier = myRoute.qualifier || 'LATEST';
        let index = -1;
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          if (
            route.functionName === this.functionName &&
            route.path === myRoute.path &&
            route.qualifier === qualifier
          ) {
            index = i;
            break;
          }
        }
        if (index !== -1) {
          routes.splice(index, 1);
          customDomainInputs.props = onlineCustomDomain;
          onlineCustomDomain.routeConfig.routes = routes;
          // console.log(JSON.stringify(customDomainInputs));
          if (
            customDomainInputs.args.indexOf('-y') === -1 &&
            customDomainInputs.args.indexOf('--assume-yes') === -1
          ) {
            customDomainInputs.args.push('-y');
          }
          if (routes.length > 0) {
            await domainInstance.deploy(customDomainInputs);
          } else {
            await domainInstance.remove(customDomainInputs);
          }
        } else {
          logger.warn(
            `{path: ${myRoute.path}, functionName: ${this.functionName}} not found in custom domain ${domainName}`,
          );
        }
      }
    } catch (error) {
      logger.warn(`removeCustomDomain error: ${error}`);
    }
  }
}
