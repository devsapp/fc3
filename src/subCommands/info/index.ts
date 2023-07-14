import { ICredentials } from '@serverless-devs/component-interface';
import _ from 'lodash';
import Fc20230330, { GetFunctionRequest, GetFunctionResponse } from '@alicloud/fc20230330';
import { RegionList, IInputs } from '../../interface';
import { getFcClient } from '../../utils';
import logger from '../../logger';

export default class Info {
  readonly region: string;
  readonly functionName: string;
  readonly client: Fc20230330;

  constructor(private inputs: IInputs) {
    this.region = _.get(inputs, 'props.region');
    this.functionName = _.get(inputs, 'props.function.functionName');
    this.checkProps();
    this.client = getFcClient(this.region, this.inputs.credential as ICredentials);
  }

  async run() {
    const functionConfig = await this.getFunction();
    return {
      region: this.region,
      function: this.getConfig(functionConfig),
    };
  }

  async getFunction(): Promise<GetFunctionResponse | { error: any }> {
    const getFunctionRequest = new GetFunctionRequest({});
    try {
      const result = await this.client.getFunction(this.functionName, getFunctionRequest);
      logger.debug(`Get function ${this.functionName} response:`);
      logger.debug(result);
      return result;
    } catch (ex) {
      logger.debug(`Get function ${this.functionName} error: ${ex}`);
      return {
        error: ex,
      };
    }
  }

  private getConfig(config: any) {
    if (config?.error) {
      return {
        error: {
          code: config.error.code,
          message: config.error.message,
        },
      };
    }

    return config;
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
