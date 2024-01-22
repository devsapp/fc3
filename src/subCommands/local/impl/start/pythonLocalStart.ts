import { BaseLocalStart } from './baseLocalStart';
import _ from 'lodash';
import { IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';

export class PythonLocalStart extends BaseLocalStart {
  beforeStart(): boolean {
    const ret = super.beforeStart();
    if (!ret) {
      return ret;
    }
    const debugIDEArray: string[] = [IDE_VSCODE];
    if (_.isString(this.getDebugIDE()) && !debugIDEArray.includes(this.getDebugIDE())) {
      logger.error('python runtime debug only support vscode');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      return `FC_DEBUG_ARGS=-m ptvsd --host 0.0.0.0 --port ${this.getDebugPort()} --wait`;
    }
    return '';
  }
}
