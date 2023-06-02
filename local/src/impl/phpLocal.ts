import { BaseLocalInvoke } from './baseLocal';
import { lodash as _ } from '@serverless-devs/core';
import * as ip from 'ip';

export class PhpLocalInvoke extends BaseLocalInvoke {

  getDebugArgs(): string {
    const remoteIp = ip.address();
    if (_.isFinite(this.getDebugPort())) {
      return `XDEBUG_CONFIG=remote_enable=1 remote_autostart=1 remote_port=${this.getDebugPort()} remote_host=${remoteIp}`;
    }
    return "";
  }
}
