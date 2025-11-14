import { ICredentials } from '@serverless-devs/component-interface';
import { IInputs } from '../../../interface';
import FC from '../../../resources/fc';
import { isAppCenter } from '../../../utils';

export default abstract class Base {
  readonly fcSdk: FC;
  needDeploy: boolean | undefined;

  constructor(readonly inputs: IInputs, needDeploy: boolean | undefined) {
    this.needDeploy = needDeploy;
    const function_ai = isAppCenter() ? 'function_ai;' : '';
    this.fcSdk = new FC(inputs.props.region, inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `${function_ai}Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:deploy`,
    });
  }

  abstract before(): Promise<void>;
  abstract run(): Promise<any>;
}
