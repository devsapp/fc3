import { BaseLocalInvoke } from './baseLocalInvoke';
import _ from 'lodash';
import { runCommand } from '../../../../utils';
import logger from '../../../../logger';
import * as portFinder from 'portfinder';
import chalk from 'chalk';

export class CustomLocalInvoke extends BaseLocalInvoke {
  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      // TODO 参数支持自定义调试参数实现断点调试
      // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
    }
    return '';
  }

  // custom runtime 暂时不能 docker run -d 模式， 否则无法打印函数返回值
  // TODO 等新的 custom runtime 镜像
  async getLocalInvokeCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    this.port = port;

    const mntStr = await this.getMountString();
    const image = await this.getRuntimeRunImage();
    const envStr = await this.getEnvString();
    const dockerCmdStr = `docker run --name ${this.getContainerName()} --platform linux/amd64 --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image}`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    logger.debug(`${chalk.blue(dockerCmdStr)}\n`);
    return dockerCmdStr;
  }

  async runInvoke() {
    const cmdStr = await this.getLocalInvokeCmdStr();
    await runCommand(cmdStr, runCommand.showStdout.inherit);
  }

  async getEnvString(): Promise<string> {
    let envStr = await super.getEnvString();
    //  AGENT_SCRIPT
    let agent_script = '';
    const { customRuntimeConfig } = this.inputs.props;
    if (!_.isEmpty(customRuntimeConfig)) {
      const { command } = customRuntimeConfig;
      const { args } = customRuntimeConfig;
      if (!_.isEmpty(command)) {
        agent_script += command.join(' ');
      }

      if (!_.isEmpty(args)) {
        agent_script += ` ${args.join(' ')}`;
      }

      if (!_.isEmpty(agent_script)) {
        envStr += ` -e "AGENT_SCRIPT=${agent_script}"`;
      }
    }
    return envStr;
  }
}
