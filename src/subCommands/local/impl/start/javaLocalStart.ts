import { BaseLocalStart } from './baseLocalStart';
import _ from 'lodash';
import { IDE_INTELLIJ, IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';

export class JavaLocalStart extends BaseLocalStart {
  beforeStart(): boolean {
    const ret = super.beforeStart();
    if (!ret) {
      return ret;
    }
    const debugIDEArray: string[] = [IDE_VSCODE, IDE_INTELLIJ];
    if (_.isString(this.getDebugIDE()) && !debugIDEArray.includes(this.getDebugIDE())) {
      logger.error('java runtime debug only support vscode and intellij');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === 'java8') {
        return `FC_DEBUG_ARGS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${this.getDebugPort()}`;
      }
      if (this.getRuntime() === 'java11') {
        return `FC_DEBUG_ARGS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${this.getDebugPort()}`;
      }
    }
    return '';
  }
}
