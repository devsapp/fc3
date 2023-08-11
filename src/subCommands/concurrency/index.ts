import { parseArgv } from "@serverless-devs/utils";
import commandsHelp from '../../commands-help/concurrency';
import { IInputs, IRegion } from "../../interface";
import logger from "../../logger";
import _ from "lodash";
import FC from "../../resources/fc";
import { promptForConfirmOrDetails } from "../../utils";

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Concurrency {
  private region: IRegion;
  private functionName: string;
  private reservedConcurrency?: number;
  private fcSdk: FC;
  private yes: boolean;
  readonly subCommand: string;

  constructor(inputs: IInputs) {
    const {
      'function-name': functionName,
      'reserved-concurrency': reservedConcurrency,
      region,
      yes,
      _: subCommands,
    } = parseArgv(inputs.args, {
      alias: {
        yes: 'y',
      },
      boolean: ['y'],
      string: ['reserved-concurrency', 'function-name', 'region'],
    });

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(`Command "${subCommand}" not found, please use the command name instead`);
    }

    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    this.functionName = functionName || _.get(inputs, 'props.function.functionName');
    logger.debug(`function name: ${this.functionName}`);
    this.reservedConcurrency = reservedConcurrency ? Number(reservedConcurrency) : undefined;
    logger.debug(`reservedConcurrency: ${reservedConcurrency}`);

    if (_.isEmpty(this.region) || _.isEmpty(this.functionName)) {
      throw new Error(`Region and function-name is required, region: ${this.region} and function-name: ${this.functionName}`);
    }

    this.yes = yes;
    this.subCommand = subCommand;

    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });
  }

  async get() {
    return await this.fcSdk.getFunctionConcurrency(this.functionName);
  }

  async put() {
    if (!_.isNumber(this.reservedConcurrency)) {
      throw new Error(`ReservedConcurrency must be a number, got ${this.reservedConcurrency}. Please specify a number through --reserved-concurrency <number>`);
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
    return await this.fcSdk.deleteFunctionConcurrency(this.functionName);
  }
}