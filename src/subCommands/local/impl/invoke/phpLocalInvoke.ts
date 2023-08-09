import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';
import * as ip from 'ip';
import { IDE_VSCODE } from '../../../../constant';
import logger from '../../../../logger';

export class PhpLocalInvoke extends BaseLocalInvoke {
  beforeInvoke(): boolean {
    const ret = super.beforeInvoke();
    if (!ret) {
      return ret;
    }
    if (_.isString(this.getDebugIDE()) && this.getDebugIDE() != IDE_VSCODE) {
      logger.error('php runtime debug only support vscode');
      return false;
    }
    return true;
  }

  getDebugArgs(): string {
    const remoteIp = ip.address();
    logger.debug(`using remote_ip ${remoteIp}`);
    if (_.isFinite(this.getDebugPort())) {
      return `XDEBUG_CONFIG=remote_enable=1 remote_autostart=1 remote_port=${this.getDebugPort()} remote_host=${remoteIp}`;
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
            type: 'php',
            request: 'launch',
            port: debugPort,
            stopOnEntry: false,
            pathMappings: {
              '/code': `${codePath}`,
            },
            ignore: ['/var/fc/runtime/**'],
          },
        ],
      },
      null,
      4,
    );
  }
}
