import { BaseLocal } from '../baseLocal';
import logger from '../../common/logger';
import { lodash as _ } from '@serverless-devs/core';
import { runShellCommand } from "../runCommand";
import * as portFinder from 'portfinder';


export class BaseLocalStart extends BaseLocal {
  beforeStart(): boolean {
    logger.debug("beforeStart ...");
    return super.before();
  }

  afterStart() {
    logger.debug("afterStart ...");
    return super.after();
  }

  async start() {
    const check = this.beforeStart();
    if (!check) {
      return;
    }
    await this.runStart();
    this.afterStart();
  }

  async runStart() {
    const cmdStr = await this.getLocalStartCmdStr();
    await runShellCommand(cmdStr, true);
  }

  async getLocalStartCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    logger.info(`Found available port: ${port}`);
    const mntStr = await this.getMountString();
    let dockerCmdStr = `docker run --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${this.getEnvString()} ${this.getRuntimeRunImage()} --http --server`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr
  }

  getCaPort(): number {
    return this.getFunctionProps().caPort as number || 9000;
  }
}
