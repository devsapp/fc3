import { BaseLocalInvoke } from './baseLocalInvoke';
import { lodash as _ } from '@serverless-devs/core';
import { IDE_VSCODE } from '../const';
import logger from '../../common/logger';

export class NodejsLocalInvoke extends BaseLocalInvoke {
  beforeInvoke(): boolean {
    const ret = super.beforeInvoke();
    if (!ret) {
      return ret;
    }
    if (_.isString(this.getDebugIDE()) && this.getDebugIDE() != IDE_VSCODE) {
      logger.error('nodejs runtime debug only support vscode');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === 'nodejs6') {
        return `DEBUG_OPTIONS=--debug-brk=${this.getDebugPort()}`;
      } else {
        return `DEBUG_OPTIONS=--inspect-brk=0.0.0.0:${this.getDebugPort()}`;
      }
    }
    return '';
  }

  async generateVscodeDebugConfig(): Promise<string> {
    const codePath = await this.getCodeUri();
    const debugPort = this.getDebugPort();
    const functionName = this.getFunctionName();

    if (this.getRuntime() == 'nodejs6') {
      return JSON.stringify(
        {
          version: '0.2.0',
          configurations: [
            {
              name: `fc/${functionName}`,
              type: 'node',
              request: 'attach',
              address: 'localhost',
              port: debugPort,
              localRoot: `${codePath}`,
              remoteRoot: '/code',
              protocol: 'legacy',
              stopOnEntry: false,
            },
          ],
        },
        null,
        4,
      );
    } else {
      return JSON.stringify(
        {
          version: '0.2.0',
          configurations: [
            {
              name: `fc/${functionName}`,
              type: 'node',
              request: 'attach',
              address: 'localhost',
              port: debugPort,
              localRoot: `${codePath}`,
              remoteRoot: '/code',
              protocol: 'inspector',
              stopOnEntry: false,
            },
          ],
        },
        null,
        4,
      );
    }
  }
}
