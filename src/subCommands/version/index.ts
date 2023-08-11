import { parseArgv } from '@serverless-devs/utils';
import { IInputs, IRegion } from '../../interface';
import _ from 'lodash';
import logger from '../../logger';
import FC from '../../resources/fc';
import commandsHelp from '../../commands-help/version';
import { promptForConfirmOrDetails } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Version {
  private region: IRegion;
  private functionName: string;
  private description: string;
  private versionId: string;
  private fcSdk: FC;
  private yes: boolean;
  readonly subCommand: string;

  constructor(inputs: IInputs) {
    const {
      'function-name': functionName,
      'version-id': versionId,
      region,
      description,
      yes,
      _: subCommands,
    } = parseArgv(inputs.args, {
      alias: {
        yes: 'y',
      },
      boolean: ['y'],
      string: ['description', 'version-id', 'function-name', 'region'],
    });

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(`Command "${subCommand}" not found, please use the command name instead`);
    }
    this.yes = yes;
    this.subCommand = subCommand;
    this.description = description;
    this.versionId = versionId;
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    this.functionName = functionName || _.get(inputs, 'props.function.functionName');
    logger.debug(`function name: ${this.functionName}`);

    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });
  }

  async list() {
    return await this.fcSdk.listFunctionVersion(this.functionName);
  }

  async publish() {
    return await this.fcSdk.publishFunctionVersion(this.functionName, this.description);
  }

  async remove() {
    if (!this.versionId) {
      throw new Error(`Need specify remove the versionId`);
    }
    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        `Are you sure you want to delete the ${this.functionName} function ${this.versionId} version?`,
      );
      if (!y) {
        logger.debug(`Skip remove ${this.functionName} function ${this.versionId} version`);
        return;
      }
    }
    return await this.fcSdk.removeFunctionVersion(this.functionName, this.versionId);
  }
}
