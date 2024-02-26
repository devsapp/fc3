import { IDE_INTELLIJ, IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';
import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';

export class JavaLocalInvoke extends BaseLocalInvoke {
  beforeInvoke(): boolean {
    const ret = super.beforeInvoke();
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
