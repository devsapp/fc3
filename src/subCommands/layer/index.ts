/* eslint-disable no-await-in-loop */
import { parseArgv, getRootHome } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/layer';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import zip from '@serverless-devs/zip';
import downloads from '@serverless-devs/downloads';
import path from 'path';
import fs from 'fs';
import { promptForConfirmOrDetails, tableShow } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Layer {
  readonly subCommand: string;
  private region: IRegion;
  private fcSdk: FC;
  private yes: boolean;
  private opts: any;
  private baseDir: string;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'table', 'y', 'simple', 'public', 'official'],
      string: [
        'region',
        'layer-name',
        'code',
        'description',
        'compatible-runtime',
        'prefix',
        'version-id',
      ],
    });

    logger.debug(`layer opts: ${JSON.stringify(opts)}`);
    this.baseDir = inputs.baseDir || process.cwd();

    logger.info(`Layer baseDir is: ${this.baseDir}`);

    const { region, y, _: subCommands } = opts;

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 layer -h" to query how to use the command`,
      );
    }
    this.region = region || _.get(inputs, 'props.region', '');
    logger.debug(`${this.region}`);
    checkRegion(this.region);
    this.yes = !!y;
    this.subCommand = subCommand;
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:layer`,
    });

    this.opts = opts;
  }

  async list() {
    // eslint-disable-next-line prefer-const
    let query: any = {
      limit: 20,
    };
    if (this.opts.prefix !== undefined) {
      query.prefix = this.opts.prefix;
    }
    if (this.opts.public !== undefined) {
      query.public = this.opts.public.toString();
    }
    if (this.opts.official !== undefined) {
      query.official = this.opts.official.toString();
      if (this.opts.official) {
        query.public = 'true';
      }
    }
    const list = await this.fcSdk.listAllLayers(query);

    if (this.opts.table) {
      const showKey = [
        'layerName',
        'description',
        'version',
        'compatibleRuntime',
        'acl',
        'layerVersionArn',
      ];
      tableShow(list, showKey);
    } else {
      return list.map(
        ({ layerName, description, version, compatibleRuntime, layerVersionArn, acl }) => ({
          layerName,
          layerVersionArn,
          version,
          acl,
          description,
          compatibleRuntime,
        }),
      );
    }
  }

  async info() {
    let ret = await this._getLayer();
    ret = _.omit(ret, ['code', 'createTime', 'license', 'codeChecksum', 'codeSize']);
    return ret;
  }

  async versions() {
    const layerName = this.opts['layer-name'];
    if (_.isEmpty(layerName)) {
      throw new Error('layerName not specified, please specify --layer-name');
    }
    const { layers } = await this.fcSdk.listLayerVersions(layerName);
    for (let i = 0; i < layers.length; i++) {
      layers[i] = _.omit(layers[i], ['code', 'createTime', 'license', 'codeChecksum', 'codeSize']);
    }
    if (this.opts.table) {
      const showKey = [
        'layerName',
        'description',
        'version',
        'compatibleRuntime',
        'acl',
        'layerVersionArn',
      ];
      tableShow(layers, showKey);
    } else {
      return layers;
    }
  }

  async publish() {
    const layerName = this.opts['layer-name'];
    const codeUri = this.opts.code;
    const compatibleRuntime = this.opts['compatible-runtime'];

    if (_.isEmpty(layerName)) {
      throw new Error('layerName not specified, please specify --layer-name');
    }
    if (_.isEmpty(codeUri)) {
      throw new Error('layer code path not specified, please specify --code');
    }
    if (_.isEmpty(compatibleRuntime)) {
      throw new Error(
        'compatible runtime is not specified, please specify --compatible-runtime, for example "python3.9,python3.10"',
      );
    }

    const toZipDir: string = path.isAbsolute(codeUri) ? codeUri : path.join(this.baseDir, codeUri);

    let zipPath = toZipDir;
    let generateZipFilePath = '';
    if (!toZipDir.endsWith('.zip')) {
      const zipConfig = {
        codeUri: toZipDir,
        outputFileName: `${this.region}_${layerName}_${Date.now()}.zip`,
        outputFilePath: path.join(getRootHome(), '.s', 'fc', 'zip'),
        ignoreFiles: ['.fcignore'],
        logger: logger.instance,
      };
      generateZipFilePath = (await zip(zipConfig)).outputFile;
      zipPath = generateZipFilePath;
    }

    logger.debug(`Zip file: ${zipPath}`);
    const ossConfig = await this.fcSdk.uploadCodeToTmpOss(zipPath);
    logger.debug('ossConfig: ', ossConfig);

    const compatibleRuntimeList = compatibleRuntime.split(',');

    const result = await this.fcSdk.createLayerVersion(
      layerName,
      ossConfig.ossBucketName,
      ossConfig.ossObjectName,
      compatibleRuntimeList,
      this.opts.description || '',
    );

    if (generateZipFilePath) {
      try {
        fs.rmSync(generateZipFilePath);
      } catch (ex) {
        logger.debug(`Unable to remove zip file: ${zipPath}`);
      }
    }
    return result;
  }

  async remove() {
    const layerName = this.opts['layer-name'];
    if (_.isEmpty(layerName)) {
      throw new Error('layerName not specified, please specify --layer-name');
    }
    let msg = `Are you sure you want to delete the layer: ${layerName} with all versions?`;
    const version = this.opts['version-id'];
    if (version) {
      msg = `Are you sure you want to delete the layer: ${layerName} with version=${version}`;
    }
    if (!this.yes) {
      const y = await promptForConfirmOrDetails(msg);
      if (!y) {
        logger.debug(`Skip remove layer: ${layerName}`);
        return;
      }
    }
    if (version) {
      await this.fcSdk.deleteLayerVersion(layerName, version);
    } else {
      try {
        const { layers } = await this.fcSdk.listLayerVersions(layerName);
        for (const l of layers) {
          await this.fcSdk.deleteLayerVersion(layerName, l.version);
        }
      } catch (error) {
        logger.debug(error);
      }
    }
  }

  async download() {
    const { code, layerName, version } = await this._getLayer();
    const url = code.location;

    const localDir = path.join(
      getRootHome(),
      'cache',
      'layers',
      `${this.inputs.credential.AccountID}-${this.region}-${layerName}`,
    );
    const fileName = path.join(localDir, `${version}.zip`);
    if (fs.existsSync(fileName)) {
      logger.debug('The layer code already exists locally, skip the download');
      return fileName;
    }
    const codeUrl = url.replace('-internal.aliyuncs.com', '.aliyuncs.com');
    await downloads(codeUrl, {
      dest: localDir,
      filename: version,
      extract: false,
    });
    return fileName;
  }

  async acl() {
    const layerName = this.opts['layer-name'];
    if (_.isEmpty(layerName)) {
      throw new Error('layerName not specified, please specify --layer-name');
    }
    const isPublic = this.opts.public;
    await this.fcSdk.putLayerACL(layerName, isPublic.toString());
  }

  private async _getLayer() {
    const layerName = this.opts['layer-name'];
    const version = this.opts['version-id'];
    if (_.isEmpty(layerName)) {
      throw new Error('layerName not specified, please specify --layer-name');
    }
    if (_.isEmpty(version)) {
      throw new Error('version not specified, please specify --version-id');
    }
    return await this.fcSdk.getLayerVersion(layerName, version);
  }
}
