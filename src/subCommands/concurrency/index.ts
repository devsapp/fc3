import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/concurrency';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { getUserAgent, promptForConfirmOrDetails } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Concurrency {
  readonly subCommand: string;
  private region: IRegion;
  private functionName: string;
  private reservedConcurrency?: number;
  private fcSdk: FC;
  private yes: boolean;

  constructor(inputs: IInputs) {
    const {
      'function-name': functionName,
      'reserved-concurrency': reservedConcurrency,
      region,
      'assume-yes': yes,
      _: subCommands,
    } = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['y'],
      string: ['reserved-concurrency', 'function-name', 'region'],
    });

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 concurrency -h" to query how to use the command`,
      );
    }

    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }

    this.reservedConcurrency = reservedConcurrency ? Number(reservedConcurrency) : undefined;
    logger.debug(`reservedConcurrency: ${reservedConcurrency}`);

    this.yes = !!yes;
    this.subCommand = subCommand;

    const userAgent = getUserAgent(inputs.userAgent, 'concurrency');
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });
  }

  async get() {
    return await this.fcSdk.getFunctionConcurrency(this.functionName);
  }

  async put() {
    if (!_.isNumber(this.reservedConcurrency) || isNaN(this.reservedConcurrency)) {
      throw new Error(
        `ReservedConcurrency must be a number, got ${this.reservedConcurrency}. Please specify a number through --reserved-concurrency <number>`,
      );
    }
    return await this.fcSdk.putFunctionConcurrency(this.functionName, this.reservedConcurrency);
  }

  async remove() {
    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        `Are you sure you want to delete the ${this.functionName} function concurrency?`,
      );
      if (!y) {
        logger.debug(`Skip remove ${this.functionName} function concurrency`);
        return;
      }
    }
    return await this.fcSdk.removeFunctionConcurrency(this.functionName);
  }
}
