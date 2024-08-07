/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import {
  IInputs,
  IRegion,
  ITrigger,
  convertIHttpTriggerConfig,
  instanceOfIHttpTriggerConfig,
} from '../../interface';
import { diffConvertPlanYaml } from '@serverless-devs/diff';
import FC, { GetApiType } from '../../resources/fc';
import { FC_API_ERROR_CODE } from '../../resources/fc/error-code';
import logger from '../../logger';
import { FC_TRIGGER_DEFAULT_CONFIG } from '../../default/config';
import loadComponent from '@serverless-devs/load-component';
import { IInputs as _IInputs } from '@serverless-devs/component-interface';
import { transformCustomDomainProps } from '../../utils';
import { FC3_DOMAIN_COMPONENT_NAME } from '../../constant';

export default class Plan {
  readonly region: IRegion;
  readonly functionName: string;
  readonly triggers: ITrigger[];
  readonly fcSdk: FC;

  constructor(private inputs: IInputs) {
    this.region = _.get(this.inputs, 'props.region');
    this.functionName = _.get(inputs, 'props.functionName');

    if (!this.region) {
      throw new Error('Region not specified');
    }
    logger.debug(`region: ${this.region}`);
    if (!this.functionName) {
      throw new Error('Function name not specified');
    }

    this.triggers = _.get(inputs, 'props.triggers', []).map((item) =>
      _.defaults(item, FC_TRIGGER_DEFAULT_CONFIG),
    );
    this.fcSdk = new FC(inputs.props.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:plan`,
    });

    this.triggers = this.triggers.map((item) => {
      const newItem = JSON.parse(JSON.stringify(item));
      if (newItem.triggerType === 'http' && instanceOfIHttpTriggerConfig(newItem.triggerConfig)) {
        newItem.triggerConfig = convertIHttpTriggerConfig(newItem.triggerConfig);
      }
      return newItem;
    });
  }

  async run() {
    const functionConfig = await this.planFunction();
    const triggersConfig = await this.planTriggers();
    const asyncInvokeConfig = await this.planAsyncInvokeConfig();
    const vpcBindingConfig = await this.planVpcBinding();

    let showDiff = `region: ${this.region}\n${functionConfig.show}`;

    if (!_.isEmpty(this.triggers)) {
      showDiff += `\ntriggers:\n${triggersConfig.show}`;
    }

    if (_.get(this.inputs.props, 'asyncInvokeConfig')) {
      showDiff += `\nasyncInvokeConfig:\n${asyncInvokeConfig.show}`;
    }

    if (_.get(this.inputs.props, 'vpcBinding')) {
      showDiff += `\nvpcBinding:\n${vpcBindingConfig.show}`;
    }

    showDiff = showDiff.replace(/^/gm, '    ');

    logger.write(`${this.inputs.resource.name}:\n${showDiff}`);

    await this.planCustomDomain();
  }

  private async planFunction() {
    let remote = {};
    try {
      remote = await this.fcSdk.getFunction(this.functionName, GetApiType.simpleUnsupported);
    } catch (ex) {
      logger.debug(`Get remote function config error: ${ex.message}`);
      if (ex.code === FC_API_ERROR_CODE.FunctionNotFound) {
        remote = {};
      }
    }
    _.unset(this.inputs.props, 'code');
    // eslint-disable-next-line prefer-const
    let local = _.cloneDeep(this.inputs.props);
    _.unset(local, 'region');
    _.unset(local, 'triggers');
    _.unset(local, 'asyncInvokeConfig');
    _.unset(local, 'endpoint');
    _.unset(local, 'vpcBinding');
    _.unset(local, 'artifact');
    _.unset(local, 'customDomain');
    const config = FC.replaceFunctionConfig(local, remote);
    return diffConvertPlanYaml(config.remote, config.local, { deep: 0, complete: true });
  }

  private async planTriggers() {
    const result = [];
    for (const triggerConfig of this.triggers) {
      const { triggerName } = triggerConfig;
      let remote = {};
      try {
        remote = await this.fcSdk.getTrigger(
          this.functionName,
          triggerName,
          GetApiType.simpleUnsupported,
        );
      } catch (ex) {
        logger.debug(`Get remote function config error: ${ex.message}`);
        if (
          ex.code === FC_API_ERROR_CODE.FunctionNotFound ||
          ex.code === FC_API_ERROR_CODE.TriggerNotFound
        ) {
          remote = {};
        }
      }
      result.push(remote);
    }

    return diffConvertPlanYaml(result, this.triggers, { deep: 1, complete: true });
  }

  private async planAsyncInvokeConfig() {
    let remote = {};
    const asyncInvokeConfig = _.get(this.inputs, 'props.asyncInvokeConfig', {});
    const qualifier = _.get(asyncInvokeConfig, 'qualifier', 'LATEST');
    try {
      const result = await this.fcSdk.getAsyncInvokeConfig(
        this.functionName,
        qualifier,
        GetApiType.simpleUnsupported,
      );
      if (result) {
        result.qualifier = qualifier;
      }
      remote = result;
    } catch (ex) {
      logger.debug(
        `planAsyncInvokeConfig ==> Get remote asyncInvokeConfig of  ${this.functionName} error: ${ex.message}`,
      );
    }

    // eslint-disable-next-line prefer-const
    let local = _.cloneDeep(_.get(this.inputs.props, 'asyncInvokeConfig', {} as any));
    if (local) {
      local.qualifier = qualifier;
    }
    return diffConvertPlanYaml(remote, local, { deep: 1, complete: true });
  }

  private async planVpcBinding() {
    let remote: any = {};
    try {
      const result = await this.fcSdk.getVpcBinding(
        this.functionName,
        GetApiType.simpleUnsupported,
      );
      remote = result;
      if (!_.isEmpty(remote)) {
        remote?.vpcIds.sort();
      }
    } catch (ex) {
      logger.debug(
        `planVpcBinding ==> Get remote vpcBinding of  ${this.functionName} error: ${ex.message}`,
      );
    }

    // eslint-disable-next-line prefer-const
    let local = _.cloneDeep(_.get(this.inputs.props, 'vpcBinding', {})) as any;
    if (!_.isEmpty(local)) {
      local?.vpcIds.sort();
    }
    return diffConvertPlanYaml(remote, local, { deep: 1, complete: true });
  }

  private async planCustomDomain() {
    if (_.isEmpty(_.get(this.inputs.props, 'customDomain'))) {
      return {};
    }
    const customDomain = _.get(this.inputs.props, 'customDomain', {});
    const local = _.cloneDeep(customDomain) as any;
    const customDomainInputs = _.cloneDeep(this.inputs) as _IInputs;
    let props = { region: this.inputs.props.region } as any;
    if (!_.isEmpty(local)) {
      props = transformCustomDomainProps(local, this.region, this.functionName);
    }
    customDomainInputs.props = props;
    const domainInstance = await loadComponent(FC3_DOMAIN_COMPONENT_NAME, { logger });

    const infoInput = _.cloneDeep(customDomainInputs);
    let { domainName } = customDomainInputs.props;
    const planInput = _.cloneDeep(customDomainInputs);
    try {
      const onlineCustomDomain = await domainInstance.info(infoInput);
      // console.log(JSON.stringify(onlineCustomDomain, null, 2));
      const routes = onlineCustomDomain?.routeConfig?.routes;
      let found = false;
      if (routes) {
        domainName = onlineCustomDomain.domainName;
        const myRoute = local.route;
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          if (route.functionName !== this.functionName && route.path === myRoute.path) {
            throw new Error(
              `${domainName} ==> path ${route.path} is used by other function: ${route.functionName}`,
            );
          }
          if (route.functionName === this.functionName && route.path === myRoute.path) {
            found = true;
          }
        }
      }
      if (!found) {
        const myRoute = _.cloneDeep(local.route);
        myRoute.functionName = this.functionName;
        routes.push(myRoute);
      }
      planInput.props.routeConfig.routes = routes;
      if (local.protocol.toUpperCase() === 'HTTP') {
        planInput.props.protocol = onlineCustomDomain.protocol;
      }
      if (!_.isEmpty(local.certConfig)) {
        planInput.props.certConfig = local.certConfig;
      } else if (!_.isEmpty(onlineCustomDomain.certConfig)) {
        planInput.props.certConfig = onlineCustomDomain.certConfig;
      }
      if (!_.isEmpty(local.tlsConfig)) {
        planInput.props.tlsConfig = local.tlsConfig;
      } else if (!_.isEmpty(onlineCustomDomain.tlsConfig)) {
        planInput.props.tlsConfig = onlineCustomDomain.tlsConfig;
      }
      if (!_.isEmpty(local.authConfig)) {
        planInput.props.authConfig = local.authConfig;
      } else if (!_.isEmpty(onlineCustomDomain.authConfig)) {
        planInput.props.authConfig = onlineCustomDomain.authConfig;
      }
      if (!_.isEmpty(local.wafConfig)) {
        planInput.props.wafConfig = local.wafConfig;
      } else if (!_.isEmpty(onlineCustomDomain.wafConfig)) {
        planInput.props.wafConfig = onlineCustomDomain.wafConfig;
      }
    } catch (e) {
      logger.debug(e.message);
      if (!e.message.includes('DomainNameNotFound')) {
        throw e;
      }
    }
    planInput.props.domainName = domainName;
    const id = `${this.functionName}/${domainName}`;
    logger.debug(`plan ${id}, planInput props = \n${JSON.stringify(planInput.props, null, 2)}`);
    return domainInstance.plan(planInput);
  }
}
