import { BaseLocalStart } from './baseLocalStart';
import _ from 'lodash';
import { IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';

export class NodejsLocalStart extends BaseLocalStart {
  beforeStart(): boolean {
    const ret = super.beforeStart();
    if (!ret) {
      return ret;
    }
    if (_.isString(this.getDebugIDE()) && this.getDebugIDE() !== IDE_VSCODE) {
      logger.error('nodejs runtime debug only support vscode');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === 'nodejs6') {
        return `FC_DEBUG_ARGS=--debug-brk=${this.getDebugPort()}`;
      } else {
        return `FC_DEBUG_ARGS=--inspect-brk=0.0.0.0:${this.getDebugPort()}`;
      }
    }
    return '';
  }
}
