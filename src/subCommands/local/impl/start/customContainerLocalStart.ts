import { BaseLocalStart } from './baseLocalStart';
import _ from 'lodash';
import logger from '../../../../logger';
import * as portFinder from 'portfinder';
import { execSync } from 'child_process';

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
      throw new Error('only custom container get entrypoint and args');
    }
    let bootStrap = '';
    const customContainerConfig = this.inputs.props.customContainerConfig;
    if (_.has(customContainerConfig, 'entrypoint')) {
      bootStrap += customContainerConfig.entrypoint.join(' ');
    }
    if (_.has(customContainerConfig, 'command')) {
      bootStrap += ' ' + customContainerConfig.command.join(' ');
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
    const envStr = await this.getEnvString();
    const image = await this.getRuntimeRunImage();
    let dockerCmdStr = `docker run --platform linux/amd64 --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image}`;
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
    const image = this.getRuntimeRunImage();
    process.on('SIGINT', () => {
      console.log('\nSIGINT, stop container');
      const out = execSync(`docker ps -a | grep ${image} | awk '{print $1}' | xargs docker kill`);
      logger.debug(`stdout: ${out}`);
      process.exit();
    });
    super.runStart();
  }
}
