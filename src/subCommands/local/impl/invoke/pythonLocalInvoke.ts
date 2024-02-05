import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';
import { IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';

export class PythonLocalInvoke extends BaseLocalInvoke {
  beforeInvoke(): boolean {
    const ret = super.beforeInvoke();
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
      // return `FC_DEBUG_ARGS=-m ptvsd --host 0.0.0.0 --port ${this.getDebugPort()} --wait`;
      return `FC_DEBUG_ARGS=-m debugpy --listen 0.0.0.0:${this.getDebugPort()} --wait-for-client`;
    }
    return '';
  }
}
