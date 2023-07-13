import { IInputs } from "@serverless-devs/component-interface";
import { parseArgv } from "@serverless-devs/utils";
import _ from 'lodash';

const SUPPORT_COMMAND = ['function', 'trigger'];

export default class Deploy {
  readonly opts: Record<string, any>;
  readonly subCommand?: string;

  constructor(private inputs: IInputs) {
    this.opts = parseArgv(this.inputs.args, {
      boolean: ['y', 'skip-push'],
      string: ['type', 'trigger-name'],
    });
    
    const subCommand = _.get(this.opts, '_.[0]');
    if (subCommand && !SUPPORT_COMMAND.includes(subCommand)) {
      throw new Error(`Not supported command: ${subCommand}`);
    }
    this.subCommand = subCommand;
  }

  async run() {

  }
}
