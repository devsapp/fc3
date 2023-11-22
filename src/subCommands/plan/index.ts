/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import { IInputs, IRegion, ITrigger } from '../../interface';
import { diffConvertPlanYaml } from '@serverless-devs/diff';
import FC, { GetApiType } from '../../resources/fc';
import { FC_API_ERROR_CODE } from '../../resources/fc/error-code';
import logger from '../../logger';
import { FC_TRIGGER_DEFAULT_CONFIG } from '../../default/config';

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
        `serverless-devs;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:plan`,
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

    logger.write(showDiff);
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
    try {
      const result = await this.fcSdk.getAsyncInvokeConfig(
        this.functionName,
        'LATEST',
        GetApiType.simpleUnsupported,
      );
      remote = result;
    } catch (ex) {
      logger.debug(
        `planAsyncInvokeConfig ==> Get remote asyncInvokeConfig of  ${this.functionName} error: ${ex.message}`,
      );
    }

    // eslint-disable-next-line prefer-const
    let local = _.cloneDeep(_.get(this.inputs.props, 'asyncInvokeConfig', {}));
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
}
