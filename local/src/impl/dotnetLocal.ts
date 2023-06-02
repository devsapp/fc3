import { BaseLocalInvoke } from './baseLocal';
import { lodash as _ } from '@serverless-devs/core';

export class DotnetLocalInvoke extends BaseLocalInvoke {

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      if (this.getRuntime() === "dotnetcore2.1") {
        return `DEBUG_OPTIONS=true`;
      }
      // TODO dotnetcore3.1, fc-docker also not support dotnetcore3.1
    }
    return "";
  }
}
