import { ICredentials } from '@serverless-devs/component-interface';
import { IInputs } from '../../../interface';
import FC from '../../../resources/fc';
import { getUserAgent } from '../../../utils';

export default abstract class Base {
  readonly fcSdk: FC;
  needDeploy: boolean | undefined;

  constructor(readonly inputs: IInputs, needDeploy: boolean | undefined) {
    this.needDeploy = needDeploy;
    const userAgent = getUserAgent(inputs.userAgent, 'deploy');
    this.fcSdk = new FC(inputs.props.region, inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });
  }

  abstract before(): Promise<void>;
  abstract run(): Promise<any>;
}
