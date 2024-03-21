import { BaseLocalStart } from './baseLocalStart';
import { runCommand } from '../../../../utils';
import _ from 'lodash';
import chalk from 'chalk';
// import logger from '../logger';

export class CustomLocalStart extends BaseLocalStart {
  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      // TODO 参数支持自定义调试参数实现断点调试
      // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
    }
    return '';
  }

  async runStart() {
    const cmdStr = await this.getLocalStartCmdStr();
    const msg = `You can use curl or Postman to make an HTTP request to localhost:${this.getCaPort()} to test the function`;
    console.log(chalk.green(msg));
    await runCommand(cmdStr, runCommand.showStdout.ignore);
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
