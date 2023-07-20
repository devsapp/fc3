import _ from 'lodash';
import { IInputs, IRegion } from '../../interface';
import { diffConvertYaml } from '@serverless-devs/diff';
import FC from '../../resources/fc';
import { FC_API_NOT_FOUND_ERROR_CODE } from '../../resources/fc/error';
import logger from '../../logger';

export default class Plan {
  readonly region: IRegion;
  readonly functionName: string;
  readonly fcSdk: FC;

  constructor(private inputs: IInputs) {
    this.region = _.get(this.inputs, 'props.region');
    this.functionName = _.get(inputs, 'props.function.functionName');
    this.fcSdk = new FC(inputs.props.region, inputs.credential);
  }

  async run() {
    const functionConfig = await this.planFunction();

    logger.write(`
region: ${this.region}
function:
${functionConfig.show}
`);
  }

  private async planFunction() {
    let remote;
    try {
      remote = await this.fcSdk.getFunction(this.functionName, 'simple-unsupported');
    } catch (ex) {
      logger.debug(`Get remote function config error: ${ex.message}`);
      if (ex.code === FC_API_NOT_FOUND_ERROR_CODE.FunctionNotFound) {
        remote = {};
      }
    }
    const config = FC.replaceFunctionConfig(this.inputs.props.function, remote);
    return diffConvertYaml(config.remote, config.local, { deep: 1, complete: true });
  }
}
