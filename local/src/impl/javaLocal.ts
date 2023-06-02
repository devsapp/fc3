import { BaseLocalInvoke } from './baseLocal';
import { lodash as _ } from '@serverless-devs/core';

export class JavaLocalInvoke extends BaseLocalInvoke {

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === "java8") {
        return `DEBUG_OPTIONS=-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${this.getDebugPort()}`;
      }
      return `DEBUG_OPTIONS=agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${this.getDebugPort()}`;
    }
    return "";
  }
}
