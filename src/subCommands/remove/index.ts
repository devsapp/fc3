import { IInputs } from '../../interface';
import logger from '../../logger';
import FC from '../../resources/fc';
import { FC_API_ERROR_CODE } from '../../resources/fc/error-code';

export default class Remove {
  private functionName: string;
  private fcSdk: FC;

  constructor(inputs: IInputs) {
    this.functionName = inputs.props.function?.functionName;
    this.fcSdk = new FC(inputs.props.region, inputs.credential);
  }

  async run() {
    await this.removeFunction();
  }

  async removeFunction() {
    try {
      await this.fcSdk.getFunction(this.functionName);
    } catch (ex) {
      logger.debug(`Remove function check error: ${ex.message}`);
      if (ex.code === FC_API_ERROR_CODE.FunctionNotFound) {
        logger.debug('Function not found, skipping remove.');
        return;
      }
    }

    await this.fcSdk.fc20230330Client.deleteFunction(this.functionName);
  }
}
