import _ from 'lodash';
import * as portFinder from 'portfinder';
import { BaseLocal } from '../baseLocal';
import logger from '../../../../logger';
import { runCommand } from '../../../../utils';

export class BaseLocalStart extends BaseLocal {
  beforeStart(): boolean {
    logger.debug('beforeStart ...');
    return super.before();
  }

  afterStart() {
    logger.debug('afterStart ...');
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
    await runCommand(cmdStr, runCommand.showStdout.append);
  }

  async getLocalStartCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    logger.info(
      `You can use curl or Postman to make an HTTP request to 127.0.0.1:${port} to test the function`,
    );
    const mntStr = await this.getMountString();
    const envStr = await this.getEnvString();
    let dockerCmdStr = `docker run --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${await this.getRuntimeRunImage()} --http --server`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr;
  }
}
