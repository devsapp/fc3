import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';
import { IDE_INTELLIJ } from '../../../../constant';
import logger from '../../../../common/logger';

export class JavaLocalInvoke extends BaseLocalInvoke {
  beforeInvoke(): boolean {
    const ret = super.beforeInvoke();
    if (!ret) {
      return ret;
    }
    if (_.isString(this.getDebugIDE()) && this.getDebugIDE() != IDE_INTELLIJ) {
      logger.error('java runtime debug only support intellij');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === 'java8') {
        return `DEBUG_OPTIONS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${this.getDebugPort()}`;
      }
      return `DEBUG_OPTIONS=agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${this.getDebugPort()}`;
    }
    return '';
  }
}
