import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/instance';
import { IInputs, IRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Instance {
  readonly subCommand: string;
  private region: IRegion;
  private fcSdk: FC;
  private opts: any;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'y'],
      string: ['region', 'function-name', 'qualifier'],
    });
    logger.debug(`Instance opts: ${JSON.stringify(opts)}`);
    const { region, _: subCommands } = opts;

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 instance -h" to query how to use the command`,
      );
    }

    this.region = region || _.get(inputs, 'props.region');
    if (!this.region) {
      throw new Error('Region not specified, please specify --region');
    }
    logger.debug(`region: ${this.region}`);

    this.subCommand = subCommand;
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });

    this.opts = opts;
  }

  async list() {
    const functionName = this.opts['function-name'] || _.get(this.inputs, 'props.functionName');
    if (_.isEmpty(functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    const qualifier = this.opts['qualifier'] || 'LATEST';
    let list = await this.fcSdk.listInstances(functionName, qualifier);
    return list;
  }

  /**
   * s3  instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --cmd "ls -lh"
   * s3  instance exec --instance-id c-64fec1fc-27c4833c325445879a28
   * s3  instance exec --instance-id `s3 invoke  | grep 'Invoke instanceId:' |  sed 's/.*: //'`
   */
  async exec() {
    const functionName = this.opts['function-name'] || _.get(this.inputs, 'props.functionName');
    if (_.isEmpty(functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    const instanceId = this.opts['instance-id'];
    if (_.isEmpty(instanceId)) {
      throw new Error('instanceId not specified, please specify --instance-id');
    }
    const qualifier = this.opts['qualifier'] || 'LATEST';
    const cmd = this.opts['cmd'] as string;
    let rawData = [];
    if (cmd) {
      rawData = ['bash', '-c', cmd];
    } else {
      rawData = ['bash', '-c', 'cd /code && bash'];
    }
    await this.fcSdk.instanceExec(functionName, instanceId, rawData, qualifier, true);
  }
}
