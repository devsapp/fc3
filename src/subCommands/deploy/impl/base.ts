import { IInputs } from "../../../interface";
import FC from "../../../resources/fc";


export default abstract class Base {
  readonly fcSdk: FC;
  needDeploy: boolean | undefined;

  constructor(readonly inputs: IInputs, needDeploy: boolean | undefined) {
    this.needDeploy = needDeploy;
    this.fcSdk = new FC(inputs.props.region, inputs.credential);
  }

  abstract before(): Promise<void>;
  abstract run(): Promise<any>;
}
