import { IInputs } from '../../../interface';
import logger from '../../../logger';
import Info from '../../info';

export default class Service {
  constructor(private inputs: IInputs, private type: 'code' | 'config' | boolean) {
    logger.debug(`deploy function type: ${this.type}`);
  }

  // 准备动作，比如创建 auto 资源、plan 能力
  async preRun() {
    // 获取远端资源配置
    const info = new Info(this.inputs);
    const result = await info.getFunction();
    if (!result.error) {
    }
  }

  async checkRemote() {}
}
