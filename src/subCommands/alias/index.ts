import { parseArgv } from '@serverless-devs/utils';
import { IInputs, IRegion, checkRegion } from '../../interface';
import _ from 'lodash';
import logger from '../../logger';
import FC from '../../resources/fc';
import commandsHelp from '../../commands-help/alias';
import { promptForConfirmOrDetails, tableShow } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Alias {
  private region: IRegion;
  private functionName: string;
  private description: string;
  private additionalVersionWeight: string;
  private versionId: string;
  private aliasName: string;
  private fcSdk: FC;
  private yes: boolean;
  private table: boolean;
  readonly subCommand: string;

  constructor(inputs: IInputs) {
    const {
      'function-name': functionName,
      'alias-name': aliasName,
      region,
      description,
      'assume-yes': yes,
      table,
      additionalVersionWeight,
      'version-id': versionId,
      _: subCommands,
    } = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
        additionalVersionWeight: 'vw',
      },
      boolean: ['y', 'table'],
      string: [
        'description',
        'additionalVersionWeight',
        'version-id',
        'alias-name',
        'function-name',
        'region',
      ],
    });

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 alias -h" to query how to use the command`,
      );
    }
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }
    logger.debug(`function name: ${this.functionName}`);
    this.yes = !!yes;
    this.table = table;
    this.subCommand = subCommand;
    this.description = description;
    this.aliasName = aliasName;
    this.versionId = versionId;
    this.additionalVersionWeight = additionalVersionWeight;

    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });
  }

  async list() {
    const aliases = await this.fcSdk.listAlias(this.functionName);
    if (this.table) {
      const showKey = ['aliasName', 'versionId', 'description', 'additionalVersionWeight'];
      tableShow(aliases, showKey);
    } else {
      return aliases;
    }
  }

  async get() {
    if (!this.aliasName) {
      throw new Error('Alias name not specified, please specify alias name');
    }
    return await this.fcSdk.getAlias(this.functionName, this.aliasName);
  }

  async publish() {
    if (!this.aliasName) {
      throw new Error('Alias name not specified, please specify --alias-name');
    }

    if (!this.versionId) {
      throw new Error('Version ID not specified, please specify --version-id');
    } else if (this.versionId.toLowerCase() === 'latest') {
      const { versionId } = await this.fcSdk.getVersionLatest(this.functionName);
      if (!versionId) {
        throw new Error(`Not found versionId in the ${this.functionName}`);
      }
      this.versionId = versionId;
    }

    let additionalVersionWeight: Record<string, number>;
    if (this.additionalVersionWeight) {
      try {
        additionalVersionWeight = JSON.parse(this.additionalVersionWeight);
      } catch (_ex) {
        throw new Error(
          `The incoming additionalVersionWeight is not a JSON. e.g.: The grayscale version is 1, accounting for 20%: '{"1":0.2}' `,
        );
      }
    }

    const config = {
      aliasName: this.aliasName,
      versionId: this.versionId,
      description: this.description,
      additionalVersionWeight,
    };
    return await this.fcSdk.publishAlias(this.functionName, this.aliasName, config);
  }

  async remove() {
    if (!this.aliasName) {
      throw new Error('Alias name not specified, please specify --alias-name');
    }
    if (!this.yes) {
      const y = await promptForConfirmOrDetails(
        `Are you sure you want to delete the ${this.functionName} function ${this.aliasName} alias?`,
      );
      if (!y) {
        logger.debug(`Skip remove ${this.functionName} function ${this.aliasName} alias?`);
        return;
      }
    }
    await this.fcSdk.removeAlias(this.functionName, this.aliasName);
  }
}
