import { BaseLocal } from '../baseLocal';
import { formatJsonString } from '../utils';
import logger from '../../../../logger';
import _ from 'lodash';
import { runCommand } from '../../../../utils';
import fs from 'fs';

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
    const argsData = this.getArgsData();
    const eventStr = _.get(argsData, 'event');
    if (!_.isEmpty(_.trim(eventStr))) {
      return formatJsonString(eventStr);
    }

    const eventFile = _.get(argsData, 'event-file');
    if (eventFile && fs.existsSync(eventFile) && fs.statSync(eventFile).isFile()) {
      const str = fs.readFileSync(eventFile, 'utf-8');
      return formatJsonString(str);
    }
    return '';
  }

  async getLocalInvokeCmdStr(): Promise<string> {
    const mntStr = await this.getMountString();
    const image = await this.getRuntimeRunImage();
    const envStr = await this.getEnvString();
    let dockerCmdStr = `docker run --platform linux/amd64 --rm --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image} ${
      this.isFastRuntime() ? '--fast-invoke' : ''
    } --event '${this.getEventString()}'`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr;
  }
}
