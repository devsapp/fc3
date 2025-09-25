/* eslint-disable no-await-in-loop */
import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/scaling';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { promptForConfirmOrDetails } from '../../utils';
import { IScalingConfig } from '../../interface/scaling_config';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Scaling {
  readonly subCommand: string;
  private region: IRegion;
  private functionName: string;
  private fcSdk: FC;
  private yes: boolean;
  private qualifier: string;
  private minInstances: number;
  private horizontalScalingPolicies: string;
  private scheduledPolicies: string;
  private residentPoolId: string;

  constructor(inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['y'],
      string: [
        'function-name',
        'region',
        'qualifier',
        'min-instances',
        'horizontal-scaling-policies',
        'scheduled-policies',
        'resident-pool-id',
      ],
    });

    logger.debug(`scaling opts: ${JSON.stringify(opts)}`);

    const {
      'function-name': functionName,
      qualifier,
      region,
      'assume-yes': yes,
      'min-instances': minInstances,
      'horizontal-scaling-policies': horizontalScalingPolicies,
      'scheduled-policies': scheduledPolicies,
      'resident-pool-id': residentPoolId,
      _: subCommands,
    } = opts;

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 scaling -h" to query how to use the command`,
      );
    }

    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }
    this.qualifier = qualifier || 'LATEST';
    this.yes = !!yes;
    this.subCommand = subCommand;
    this.minInstances = minInstances ? Number(minInstances) : undefined;
    this.horizontalScalingPolicies = horizontalScalingPolicies;
    this.scheduledPolicies = scheduledPolicies;
    this.residentPoolId = residentPoolId;

    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:scaling`,
    });
  }

  async list() {
    return await this.fcSdk.listFunctionScalingConfig(this.functionName);
  }

  async get() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }
    return await this.fcSdk.getFunctionScalingConfig(this.functionName, this.qualifier);
  }

  async put() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }

    const config: IScalingConfig = {
      minInstances: this.minInstances,
      horizontalScalingPolicies: [],
      scheduledPolicies: [],
      residentPoolId: this.residentPoolId,
    };

    if (this.horizontalScalingPolicies) {
      try {
        config.horizontalScalingPolicies = JSON.parse(this.horizontalScalingPolicies);
      } catch (_ex) {
        throw new Error(`The incoming --horizontal-scaling-policies is not a JSON.`);
      }
    }

    if (this.scheduledPolicies) {
      try {
        config.scheduledPolicies = JSON.parse(this.scheduledPolicies);
      } catch (_ex) {
        throw new Error(`The incoming --scheduled-policies is not a JSON.`);
      }
    }

    return await this.fcSdk.putFunctionScalingConfig(this.functionName, this.qualifier, config);
  }

  async remove() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }

    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        `Are you sure you want to delete the ${this.functionName} function scaling config?`,
      );
      if (!y) {
        logger.debug(`Skip remove ${this.functionName} function scaling config`);
        return;
      }
    }

    logger.spin(
      'removing',
      'function scaling config',
      `${this.region}/${this.functionName}/${this.qualifier}`,
    );
    await this.fcSdk.removeFunctionScalingConfig(this.functionName, this.qualifier);
    logger.spin(
      'removed',
      'function scaling config',
      `${this.region}/${this.functionName}/${this.qualifier}`,
    );
  }
}
