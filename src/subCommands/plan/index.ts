import _ from 'lodash';
// import Fc20230330 from '@alicloud/fc20230330';
import { simpleDiff } from '@serverless-devs/diff';
import { IInputs } from '../../interface';
import Info from '../info';
import logger from '../../logger';
import { FC_API_NOT_FOUND_ERROR_CODE } from '../../constant';

export default class Plan {
  // readonly region: string;
  // readonly functionName: string;
  // readonly client: Fc20230330;

  constructor(private inputs: IInputs) {
    // this.region = _.get(inputs, 'props.region');
    // this.functionName = _.get(inputs, 'props.function.functionName');
  }

  async run() {
    const info = new Info(this.inputs);
    const config = await info.run();
    if (config.function?.error) {
      if (config.function.error.code !== FC_API_NOT_FOUND_ERROR_CODE.FunctionNotFound) {
        logger.error(config.function.error.message);
      }
      config.function = {};
    }
    // TODO: trigger
    return simpleDiff(config, this.inputs.props, { complete: true });
  }
}
