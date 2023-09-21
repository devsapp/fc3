import { parseArgv } from '@serverless-devs/utils';
import { IInputs, IRegion, checkRegion } from '../../interface';
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
      'assume-yes': yes,
      _: subCommands,
    } = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['y'],
      string: ['description', 'version-id', 'function-name', 'region'],
    });

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 version -h" to query how to use the command`,
      );
    }
    this.yes = yes;
    this.subCommand = subCommand;
    this.description = description;
    this.versionId = versionId;
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    logger.debug(`function name: ${this.functionName}`);
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }
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

    if (this.versionId.toLowerCase() === 'latest') {
      const { versionId } = await this.fcSdk.getVersionLatest(this.functionName);
      if (!versionId) {
        throw new Error(`Not found versionId in the ${this.functionName}`);
      }
      this.versionId = versionId;
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
