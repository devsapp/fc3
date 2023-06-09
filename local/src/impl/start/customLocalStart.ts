import { BaseLocalStart } from './baseLocalStart';
import { lodash as _ } from '@serverless-devs/core';
// import logger from '../common/logger';

export class CustomLocalStart extends BaseLocalStart {

  getDebugArgs(): string {
    if (_.isFinite(this.getDebugPort())) {
      // TODO 参数支持自定义调试参数实现断点调试
      // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
    }
    return "";
  }

  getEnvString(): string {
    let envStr = super.getEnvString();
    //  AGENT_SCRIPT
    let agent_script = "";
    const customRuntimeConfig = this.getFunctionProps().customRuntimeConfig;
    if (!_.isEmpty(customRuntimeConfig)) {
      const command = customRuntimeConfig.command;
      const args = customRuntimeConfig.args;
      if (!_.isEmpty(command)) {
        agent_script += command.join(" ");
      }

      if (!_.isEmpty(args)) {
        agent_script += " " + args.join(" ");
      }

      if (!_.isEmpty(agent_script)) {
        envStr += ` -e "AGENT_SCRIPT=${agent_script}"`
      }
    }
    return envStr;
  }
}
