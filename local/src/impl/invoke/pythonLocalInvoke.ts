import { BaseLocalInvoke } from './baseLocalInvoke';
import { lodash as _ } from '@serverless-devs/core';
import { IDE_VSCODE } from '../const';
import logger from '../../common/logger';

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
      return `DEBUG_OPTIONS=-m ptvsd --host 0.0.0.0 --port ${this.getDebugPort()} --wait`;
    }
    return '';
  }

  async generateVscodeDebugConfig(): Promise<string> {
    const codePath = await this.getCodeUri();
    const debugPort = this.getDebugPort();
    const functionName = this.getFunctionName();
    return JSON.stringify(
      {
        version: '0.2.0',
        configurations: [
          {
            name: `fc/${functionName}`,
            type: 'python',
            request: 'attach',
            host: 'localhost',
            port: debugPort,
            pathMappings: [
              {
                localRoot: `${codePath}`,
                remoteRoot: '/code',
              },
            ],
          },
        ],
      },
      null,
      4,
    );
  }
}
