import { BaseLocal } from '../baseLocal';
import { formatJsonString } from '../utils';
import logger from '../../../../logger';
import _ from 'lodash';
import { runCommand } from '../../../../utils';

export class BaseLocalInvoke extends BaseLocal {
  beforeInvoke(): boolean {
    logger.debug('beforeInvoke ...');
    return super.before();
  }

  afterInvoke() {
    logger.debug('afterInvoke ...');
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
    await runCommand(cmdStr, runCommand.showStdout.append);
  }

  getEventString(): string {
    let eventStr = this.getArgsData()['event'];
    if (!_.isEmpty(_.trim(eventStr))) {
      return formatJsonString(eventStr);
    }
    // TODO:  stdin or file
    return '';
  }

  async getLocalInvokeCmdStr(): Promise<string> {
    const mntStr = await this.getMountString();
    const image = await this.getRuntimeRunImage();
    const envStr = await this.getEnvString();
    let dockerCmdStr = `docker run --rm --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image} --event '${this.getEventString()}'`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr;
  }
}
