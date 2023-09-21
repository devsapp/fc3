import { ICredentials } from '@serverless-devs/component-interface';
import _, { isEmpty } from 'lodash';
import { IInputs, IRegion, checkRegion } from '../../interface';
import FC, { GetApiType } from '../../resources/fc';
import logger from '../../logger';

export default class Info {
  readonly region: IRegion;
  readonly functionName: string;
  readonly triggersName: string[];
  readonly fcSdk: FC;
  getApiType: GetApiType;

  constructor(private inputs: IInputs) {
    this.region = _.get(inputs, 'props.region');
    this.functionName = _.get(inputs, 'props.functionName');
    this.triggersName = _.get(inputs, 'props.triggers', []).map((item) => item.triggerName);
    this.fcSdk = new FC(this.region, this.inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
    });
    this.getApiType = GetApiType.simple;
    checkRegion(this.region);
  }

  public setGetApiType(type: GetApiType) {
    this.getApiType = type;
  }

  async run() {
    const functionConfig = await this.getFunction();
    const triggers = await this.getTriggers();
    const asyncInvokeConfig = await this.getAsyncInvokeConfig();
    let info = {
      region: this.region,
    };
    info = Object.assign({}, info, functionConfig);
    info = Object.assign({}, info, {
      triggers: isEmpty(triggers) ? undefined : triggers,
      asyncInvokeConfig: isEmpty(asyncInvokeConfig) ? undefined : asyncInvokeConfig,
    });
    return info;
  }

  async getFunction(): Promise<{ error: any } | any> {
    try {
      return await this.fcSdk.getFunction(this.functionName, this.getApiType);
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
        const config = await this.fcSdk.getTrigger(this.functionName, triggerName, this.getApiType);
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
      return await this.fcSdk.getAsyncInvokeConfig(this.functionName, 'LATEST', this.getApiType);
    } catch (ex) {
      logger.debug(`Get AsyncInvokeConfig ${this.functionName} error: ${ex}`);
      return {
        error: {
          code: ex.code,
          message: ex.message,
        },
      };
    }
  }
}
