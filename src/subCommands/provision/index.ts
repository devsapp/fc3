/* eslint-disable no-await-in-loop */
import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/provision';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { getUserAgent, promptForConfirmOrDetails, sleep } from '../../utils';
import { IProvision } from '../../interface/cli-config/provision';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Provision {
  readonly subCommand: string;
  private region: IRegion;
  private functionName: string;
  private fcSdk: FC;
  private yes: boolean;
  private alwaysAllocateCPU: boolean;
  private alwaysAllocateGPU: boolean;
  private scheduledActions: string;
  private targetTrackingPolicies: string;
  private target: number;
  private defaultTarget: number;
  private qualifier: string;

  constructor(inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
        'always-allocate-cpu': 'ac',
        'always-allocate-gpu': 'ag',
      },
      boolean: ['y', 'always-allocate-cpu', 'always-allocate-gpu'],
      string: [
        'function-name',
        'region',
        'target',
        'default-target',
        'qualifier',
        'scheduled-actions',
        'target-tracking-policies',
      ],
    });

    logger.debug(`provision opts: ${JSON.stringify(opts)}`);

    const {
      'always-allocate-cpu': alwaysAllocateCPU, // 一直指定 cpu
      'always-allocate-gpu': alwaysAllocateGPU,
      'scheduled-actions': scheduledActions,
      'target-tracking-policies': targetTrackingPolicies,
      'function-name': functionName,
      qualifier,
      target,
      'default-target': defaultTarget,
      region,
      'assume-yes': yes,
      _: subCommands,
    } = opts;

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 provision -h" to query how to use the command`,
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
    this.alwaysAllocateCPU = alwaysAllocateCPU;
    this.alwaysAllocateGPU = alwaysAllocateGPU;
    this.scheduledActions = scheduledActions;
    this.targetTrackingPolicies = targetTrackingPolicies;
    this.target = target ? Number(target) : undefined;
    this.defaultTarget = defaultTarget ? Number(defaultTarget) : undefined;

    const userAgent = getUserAgent(inputs.userAgent, 'provision');
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });
  }

  async list() {
    return await this.fcSdk.listFunctionProvisionConfig(this.functionName);
  }

  async get() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }
    return await this.fcSdk.getFunctionProvisionConfig(this.functionName, this.qualifier);
  }

  async put() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }

    const targetValue = this.defaultTarget || this.target;
    if (!_.isNumber(targetValue) || isNaN(targetValue)) {
      throw new Error(
        `Target or defaultTarget must be a number, got ${targetValue}. Please specify a number through --target <number>`,
      );
    }

    const config: IProvision = {
      target: this.target,
      defaultTarget: this.defaultTarget,
      alwaysAllocateCPU: _.isBoolean(this.alwaysAllocateCPU) ? this.alwaysAllocateCPU : false,
      alwaysAllocateGPU: _.isBoolean(this.alwaysAllocateGPU) ? this.alwaysAllocateGPU : false,
      scheduledActions: [],
      targetTrackingPolicies: [],
    };
    if (this.scheduledActions) {
      try {
        config.scheduledActions = JSON.parse(this.scheduledActions);
      } catch (_ex) {
        throw new Error(`The incoming --scheduled-actions is not a JSON.`);
      }
    }

    if (this.targetTrackingPolicies) {
      try {
        config.targetTrackingPolicies = JSON.parse(this.targetTrackingPolicies);
      } catch (_ex) {
        throw new Error(`The incoming --target-tracking-policies is not a JSON.`);
      }
    }

    return await this.fcSdk.putFunctionProvisionConfig(this.functionName, this.qualifier, config);
  }

  async remove() {
    if (!this.qualifier) {
      throw new Error('Qualifier not specified, please specify --qualifier');
    }

    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        `Are you sure you want to delete the ${this.functionName} function provision?`,
      );
      if (!y) {
        logger.debug(`Skip remove ${this.functionName} function provision`);
        return;
      }
    }

    logger.spin(
      'removing',
      'function provision',
      `${this.region}/${this.functionName}/${this.qualifier}`,
    );
    await this.fcSdk.removeFunctionProvisionConfig(this.functionName, this.qualifier);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await sleep(1.5);
      const { current } = (await this.get()) || {};
      if (current === 0 || !current) {
        break;
      }
    }
    logger.spin(
      'removed',
      'function provision',
      `${this.region}/${this.functionName}/${this.qualifier}`,
    );
  }
}
