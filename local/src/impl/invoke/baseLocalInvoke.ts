import { BaseLocal } from '../baseLocal';
import { formatJsonString } from '../utils';
import logger from '../../common/logger';
import { lodash as _ } from '@serverless-devs/core';
import { runShellCommand } from "../runCommand";


export class BaseLocalInvoke extends BaseLocal {
  beforeInvoke(): boolean {
    logger.debug("beforeInvoke ...");
    return super.before();
  }

  afterInvoke() {
    logger.debug("afterInvoke ...");
    return super.after();
  }

  async invoke() {
    const check = this.beforeInvoke();
    if (!check) {
      return;
    }
    await this.runInvoke();
    this.afterInvoke();
  }

  async runInvoke() {
    const cmdStr = await this.getLocalInvokeCmdStr();
    await runShellCommand(cmdStr, true);
  }

  getEventString(): string {
    let eventStr = this.getArgsData()['event']
    if (!_.isEmpty(_.trim(eventStr))) {
      return formatJsonString(eventStr);
    }
    // TODO:  stdin or file
    return "";
  }

  async getLocalInvokeCmdStr(): Promise<string> {
    const mntStr = await this.getMountString();
    let dockerCmdStr = `docker run --rm --memory=${this.getMemorySize()}m ${mntStr} ${this.getEnvString()} ${this.getRuntimeRunImage()} --event '${this.getEventString()}'`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr
  }
}
