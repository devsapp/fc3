import { BaseLocalStart } from './baseLocalStart';
import _ from 'lodash';
import logger from '../../../../common/logger';
import * as portFinder from 'portfinder';
import { exec } from 'child_process';

export class CustomContainerLocalStart extends BaseLocalStart {
  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      // TODO 参数支持自定义调试参数实现断点调试
      // 比如调试的是 node 编写的 custom container runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
    }
    return '';
  }

  getBootStrap(): string {
    if (!this.isCustomContainerRuntime()) {
      throw new Error('only custom container get command and args');
    }
    let bootStrap = '';
    const customContainerConfig = this.getFunctionProps().customContainerConfig;
    if (_.has(customContainerConfig, 'command')) {
      bootStrap += customContainerConfig.command.join(' ');
    }
    if (_.has(customContainerConfig, 'args')) {
      bootStrap += ' ' + customContainerConfig.args.join(' ');
    }
    return bootStrap;
  }

  async getLocalStartCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    logger.info(
      `You can use curl or Postman to make an HTTP request to 127.0.0.1:${port} to test the function.`,
      'yellow',
    );
    const mntStr = await this.getMountString();
    let dockerCmdStr = `docker run --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${this.getEnvString()} ${this.getRuntimeRunImage()}`;
    if (!_.isEmpty(this.getBootStrap())) {
      dockerCmdStr += ` ${this.getBootStrap()}`;
    }
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr;
  }

  async runStart() {
    process.on('SIGINT', () => {
      console.log('SIGINT, stop container');
      exec(
        `docker ps -a | grep ${this.getRuntimeRunImage()} | awk '{print $1}' | xargs docker kill`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          process.exit();
        },
      );
    });
    super.runStart();
  }
}
