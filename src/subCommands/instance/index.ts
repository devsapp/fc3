import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/instance';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { getUserAgent } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Instance {
  readonly subCommand: string;
  private region: IRegion;
  private fcSdk: FC;
  private opts: any;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'y', 'no-workdir'],
      string: ['region', 'function-name', 'qualifier', 'shell', 'workdir'],
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
    checkRegion(this.region);
    logger.debug(`region: ${this.region}`);

    this.subCommand = subCommand;
    const userAgent = getUserAgent(inputs.userAgent, 'instance');
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });

    this.opts = opts;
  }

  async list() {
    const functionName = this.opts['function-name'] || _.get(this.inputs, 'props.functionName');
    if (_.isEmpty(functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    const qualifier = this.opts.qualifier || 'LATEST';
    const list = await this.fcSdk.listInstances(functionName, qualifier);
    return list;
  }

  /**
   * s  instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --cmd "ls -lh"
   * s  instance exec --instance-id c-64fec1fc-27c4833c325445879a28
   * s  instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --shell /bin/sh
   * s  instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --workdir /app
   * s  instance exec --instance-id `s invoke  | grep 'Invoke instanceId:' |  sed 's/.*: //'`
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
    const qualifier = this.opts.qualifier || 'LATEST';
    const cmd = this.opts.cmd as string;
    const shell = this.opts.shell || 'bash';
    const { workdir } = this.opts;
    const noWorkdir = this.opts['no-workdir'];
    let rawData = [];
    if (cmd) {
      rawData = [shell, '-c', cmd];
    } else {
      // Build the default command based on workdir option
      let defaultCmd: string;
      if (noWorkdir || workdir === '') {
        // --no-workdir flag or empty string: don't cd anywhere, use container's default WORKDIR
        defaultCmd = shell;
      } else if (workdir) {
        // User specified a custom workdir
        defaultCmd = `cd ${workdir} && ${shell}`;
      } else {
        // Default behavior (workdir undefined): try /code first, fallback to /
        defaultCmd = `(cd /code || cd /) && ${shell}`;
      }
      rawData = [shell, '-c', defaultCmd];
    }
    await this.fcSdk.instanceExec(functionName, instanceId, rawData, qualifier, true);
  }
}
