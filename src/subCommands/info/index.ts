/* eslint-disable no-await-in-loop */
import { ICredentials, IInputs as _IInputs } from '@serverless-devs/component-interface';
import _, { isEmpty } from 'lodash';
import { IInputs, IRegion, TriggerType, checkRegion } from '../../interface';
import FC, { GetApiType } from '../../resources/fc';
import logger from '../../logger';
import { parseArgv } from '@serverless-devs/utils';
import loadComponent from '@serverless-devs/load-component';
import { transformCustomDomainProps } from '../../utils';
import { FC3_DOMAIN_COMPONENT_NAME } from '../../constant';

export default class Info {
  readonly region: IRegion;
  readonly functionName: string;
  readonly triggersName: string[];
  readonly fcSdk: FC;
  getApiType: GetApiType;

  constructor(private inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help'],
      string: ['region', 'function-name'],
    });
    logger.debug(`layer opts: ${JSON.stringify(opts)}`);

    const { region, 'function-name': functionName } = opts;
    this.region = region || _.get(inputs, 'props.region', '');
    logger.debug(`${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    this.triggersName = _.get(inputs, 'props.triggers', []).map((item) => item.triggerName);
    this.fcSdk = new FC(this.region, this.inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:info`,
    });
    this.getApiType = GetApiType.simple;
  }

  public setGetApiType(type: GetApiType) {
    this.getApiType = type;
  }

  async run() {
    const functionConfig = await this.getFunction();
    if (this.inputs.props.artifact) {
      functionConfig.artifact = `${this.inputs.props.artifact}@${functionConfig.codeChecksum}`;
    }
    const triggers = await this.getTriggers();
    const asyncInvokeConfig = await this.getAsyncInvokeConfig();
    const vpcBindingConfig = await this.getVpcBing();
    const customDomain = await this.getCustomDomain();
    const provisionConfig = await this.getProvisionConfig();
    const concurrencyConfig = await this.getConcurrencyConfig();
    let info: any = {
      region: this.region,
    };
    info = Object.assign({}, info, functionConfig);
    info = Object.assign({}, info, {
      triggers: isEmpty(triggers) ? undefined : triggers,
      asyncInvokeConfig: isEmpty(asyncInvokeConfig) ? undefined : asyncInvokeConfig,
      vpcBinding: isEmpty(vpcBindingConfig) ? undefined : vpcBindingConfig,
      customDomain: isEmpty(customDomain) ? undefined : customDomain,
      provisionConfig: isEmpty(provisionConfig) ? undefined : provisionConfig,
      concurrencyConfig: isEmpty(concurrencyConfig) ? undefined : concurrencyConfig,
    });
    if (!_.isEmpty(triggers)) {
      for (let i = 0; i < triggers.length; i++) {
        const t = triggers[i];
        if (t.triggerType === TriggerType.http && t.qualifier === 'LATEST') {
          const t2 = await this.fcSdk.getTrigger(
            this.functionName,
            t.triggerName,
            GetApiType.simple,
          );
          info.url = {
            system_url: t2.httpTrigger.urlInternet,
            system_intranet_url: t2.httpTrigger.urlIntranet,
          };
        }
      }
    }
    if (!_.isEmpty(customDomain)) {
      if (info.url) {
        info.url.custom_domain = customDomain.domainName;
      } else {
        info.url = {
          custom_domain: customDomain.domainName,
        };
      }
    }
    return info;
  }

  async getFunction(): Promise<{ error: any } | any> {
    return await this.fcSdk.getFunction(this.functionName, this.getApiType);
  }

  async getTriggers(): Promise<any[]> {
    const result: any[] = [];
    for (const triggerName of this.triggersName) {
      // eslint-disable-next-line no-await-in-loop
      const config = await this.fcSdk.getTrigger(this.functionName, triggerName, this.getApiType);
      result.push(config);
    }
    return result;
  }

  async getAsyncInvokeConfig(): Promise<any> {
    if (_.isEmpty(_.get(this.inputs.props, 'asyncInvokeConfig'))) {
      return {};
    }
    const asyncInvokeConfig = _.get(this.inputs, 'props.asyncInvokeConfig', {});
    const qualifier = _.get(asyncInvokeConfig, 'qualifier', 'LATEST');
    const result = await this.fcSdk.getAsyncInvokeConfig(
      this.functionName,
      qualifier,
      this.getApiType,
    );
    if (result) {
      result.qualifier = qualifier;
    }
    return result;
  }

  async getVpcBing(): Promise<any> {
    if (!this.inputs.props.vpcBinding) {
      return {};
    }
    return await this.fcSdk.getVpcBinding(this.functionName, this.getApiType);
  }

  async getCustomDomain(): Promise<any> {
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
    return domainInstance.info(customDomainInputs);
  }

  async getProvisionConfig(): Promise<any> {
    if (_.isEmpty(_.get(this.inputs.props, 'provisionConfig'))) {
      return {};
    }
    return await this.fcSdk.getFunctionProvisionConfig(this.functionName, 'LATEST');
  }

  async getConcurrencyConfig(): Promise<any> {
    if (_.isEmpty(_.get(this.inputs.props, 'concurrencyConfig'))) {
      return {};
    }
    const result = await this.fcSdk.getFunctionConcurrency(this.functionName);
    const r = _.omit(result, ['functionArn']);
    return r;
  }
}
