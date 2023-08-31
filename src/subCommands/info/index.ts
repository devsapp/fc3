import { ICredentials } from '@serverless-devs/component-interface';
import _, { isEmpty } from 'lodash';
import { RegionList, IInputs, IRegion } from '../../interface';
import FC, { GetApiType } from '../../resources/fc';
import logger from '../../logger';

export default class Info {
  readonly region: IRegion;
  readonly functionName: string;
  readonly triggersName: string[];
  readonly fcSdk: FC;

  constructor(private inputs: IInputs) {
    this.region = _.get(inputs, 'props.region');
    this.functionName = _.get(inputs, 'props.function.functionName');
    this.checkProps();
    this.triggersName = _.get(inputs, 'props.triggers', []).map((item) => item.triggerName);
    this.fcSdk = new FC(this.region, this.inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
    });
  }

  async run() {
    const functionConfig = await this.getFunction();
    const triggers = await this.getTriggers();
    const asyncInvokeConfig = await this.getAsyncInvokeConfig();
    return {
      region: this.region,
      function: functionConfig,
      triggers: isEmpty(triggers) ? undefined : triggers,
      asyncInvokeConfig: isEmpty(asyncInvokeConfig) ? undefined : asyncInvokeConfig,
    };
  }

  async getFunction(): Promise<{ error: any } | any> {
    try {
      return await this.fcSdk.getFunction(this.functionName, GetApiType.simple);
    } catch (ex) {
      logger.debug(`Get function ${this.functionName} error: ${ex}`);
      return {
        error: {
          code: ex.code,
          message: ex.message,
        },
      };
    }
  }

  async getTriggers(): Promise<any[]> {
    const result: any[] = [];
    for (const triggerName of this.triggersName) {
      try {
        const config = await this.fcSdk.getTrigger(
          this.functionName,
          triggerName,
          GetApiType.simple,
        );
        result.push(config);
      } catch (ex) {
        logger.debug(`Get trigger ${this.functionName}/${triggerName} error: ${ex}`);
        result.push({
          error: {
            code: ex.code,
            message: ex.message,
          },
        });
      }
    }
    return result;
  }

  async getAsyncInvokeConfig(): Promise<any> {
    try {
      return await this.fcSdk.getAsyncInvokeConfig(this.functionName, 'LATEST', GetApiType.simple);
    } catch (ex) {
      logger.debug(`Get AsyncInvokeConfig ${this.functionName} error: ${ex}`);
      return;
    }
  }

  private checkProps() {
    if (!_.includes(RegionList, this.region)) {
      throw new Error(`Invalid region: ${this.region}`);
    }

    if (!_.isString(this.functionName)) {
      throw new Error(`Invalid function.functionName: ${this.region}`);
    }
  }
}
