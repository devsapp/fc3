import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';
import logger from '../../../../logger';
import * as portFinder from 'portfinder';
import { v4 as uuidV4 } from 'uuid';
import { exec } from 'child_process';

export class CustomContainerLocalInvoke extends BaseLocalInvoke {
  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      // TODO 参数支持自定义调试参数实现断点调试
      // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
    }
    return '';
  }

  async getEnvString(): Promise<string> {
    let envStr = await super.getEnvString();
    if (!_.isEmpty(this.getBootStrap())) {
      envStr += ` -e "AGENT_SCRIPT=${this.getBootStrap()}"`;
    }
    return envStr;
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

  async getLocalInvokeCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    logger.log(
      `You can use curl or Postman to make an HTTP request to 127.0.0.1:${port} to test the function. for example:`,
      'yellow',
    );
    const credentials = await this.getCredentials();
    logger.write(
      `curl -X POST 127.0.0.1:${port}/invoke -H "Content-Type: application/octet-stream" -H "x-fc-request-id: ${uuidV4()}" -H "x-fc-function-name: ${this.getFunctionName()}" -H "x-fc-function-memory: ${this.getMemorySize()}" -H "x-fc-function-timeout: ${this.getTimeout()}" -H "x-fc-initialization-timeout: ${this.getInitializerTimeout()}" -H "x-fc-function- nitializer: ${this.getInitializer()}" -H "x-fc-function-handler: ${this.getHandler()}" -H "x-fc-account-id: ${
        credentials.AccountID
      }" -H "x-fc-region: ${this.getRegion()}" -H "x-fc-access-key-id: ${
        credentials.AccessKeyID || ''
      } " -H "x-fc-access-key-secret: ${
        credentials.AccessKeySecret || ''
      }" -H "x-fc-security-token: ${
        credentials.SecurityToken || ''
      }" -d '${this.getEventString()}'`,
    );

    let dockerCmdStr = `docker run --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${this.getEnvString()} ${this.getRuntimeRunImage()}`;
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

  async runInvoke() {
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
    super.runInvoke();
  }
}
