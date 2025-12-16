import { IFunction, IInputs, IRegion } from '../../interface';
import logger from '../../logger';
import _, { isEmpty } from 'lodash';
import FC from '../../resources/fc';
import VPC_NAS from '../../resources/vpc-nas';
import { ICredentials } from '@serverless-devs/component-interface';
import { yellow } from 'chalk';
import { getEnvVariable } from '../../default/resources';
import commandsHelp from '../../commands-help/layer';
import { parseArgv } from '@serverless-devs/utils';
import assert from 'assert';
import OSS from '../../resources/oss';
import { OSSMountPoint, VPCConfig } from '@alicloud/fc20230330';
import { MODEL_DOWNLOAD_TIMEOUT } from './constants';

const commandsList = Object.keys(commandsHelp.subCommands);

export class Model {
  readonly subCommand: string;
  createResource: Record<string, any> = {};
  logger = logger;
  local: IFunction;
  envName: string;
  modelService: any;
  modelArtService: any;
  name: string;

  constructor(private inputs: IInputs) {
    this.logger.debug(
      `inputs params: ${JSON.stringify(this.inputs.props)}, args: ${this.inputs.args}`,
    );

    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help'],
      string: [],
    });
    const { _: subCommands } = opts;
    logger.debug(`subCommands: ${JSON.stringify(subCommands, null, 2)}`);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 layer -h" to query how to use the command`,
      );
    }
    this.subCommand = subCommand;
    this.local = _.cloneDeep(inputs.props);
    const { functionName } = this.inputs.props;
    this.name = getEnvVariable('ALIYUN_DEVS_REMOTE_PROJECT_NAME') || functionName;
  }

  async download() {
    // 1. auto ---> auto 包， 有 nasConfig
    // 2. 调用 download 接口，若返回一个错误是下载服务已经存在，继续等待 get 轮询。
    // 3. 轮询 get 接口
    const { annotations } = this.inputs.props;
    const modelConfig = annotations?.modelConfig;

    const params = (await this.getParams()) as any;
    try {
      if (modelConfig.solution === 'funArt' || modelConfig.solution === 'funModel') {
        const modelArtService = await this.getModelArtService();
        await modelArtService.downloadModel(this.name, params);
      } else {
        const modelService = await this.getModelService();
        await modelService.downloadModel(this.name, params);
      }
    } catch (e) {
      logger.error(`download model invocation error: ${JSON.stringify(e, null, 2)}`);
      throw new Error(`download model error: ${e.message}`);
    }
  }

  async remove() {
    logger.info('[Remove-model] remove model ...');
    const params = await this.getParams('Remove-model');
    const { annotations } = this.inputs.props;
    const modelConfig = annotations?.modelConfig;

    try {
      if (modelConfig.solution === 'funArt' || modelConfig.solution === 'funModel') {
        const modelArtService = await this.getModelArtService();
        await modelArtService.removeModel(this.name, params);
      } else {
        const modelService = await this.getModelService();
        await modelService.removeModel(this.name, params);
      }
    } catch (e) {
      logger.debug(`[Remove-model] delete model invocation error: ${JSON.stringify(e, null, 2)}`);
      logger.error(`[Remove-model] delete model invocation error: ${e.message}`);
      throw new Error(`[Remove-model] delete model error: ${e.message}`);
    }
  }

  private async getModelService() {
    const { ModelService } = await import('./model');
    return new ModelService(this.inputs);
  }

  private async getModelArtService() {
    const { ArtModelService } = await import('./fileManager');
    return new ArtModelService(this.inputs);
  }

  private _assertArrayOfStrings(variable: any) {
    assert(Array.isArray(variable), 'Variable must be an array');
    assert(
      variable.every((item) => typeof item === 'string'),
      'Variable must contain only strings',
    );
  }

  private async getParams(command = 'Download-model') {
    const { AccountID: accountID } = await this.inputs.getCredential();
    const { credential } = this.inputs;
    const { region, supplement, annotations } = this.inputs.props;
    const { functionName } = this.local;
    const modelConfig = supplement?.modelConfig || annotations?.modelConfig;

    this._validateModelConfig(modelConfig);

    logger.info(`[${command}] Start...`);
    const { nasAuto, vpcAuto, ossAuto } = FC.computeLocalAuto(this.local);
    logger.debug(`[auto] Auto compute local auto, nasAuto: ${nasAuto} ossAuto: ${ossAuto};`);

    if (ossAuto) {
      await this._handleOssAutoDeployment(region, credential);
    }

    if (nasAuto || vpcAuto) {
      await this._handleNasAutoDeployment(region, credential, nasAuto, vpcAuto, functionName);
    }

    const { nasConfig, vpcConfig, ossMountConfig } = this.local;
    logger.info(
      `[${command}] nasConfig: ${JSON.stringify(nasConfig)} vpcConfig: ${JSON.stringify(
        vpcConfig,
      )} ossMountConfig: ${JSON.stringify(ossMountConfig)}`,
    );

    return this._buildParams(
      modelConfig,
      region,
      accountID,
      nasConfig,
      vpcConfig,
      ossMountConfig,
      functionName,
    );
  }

  private _validateModelConfig(modelConfig: any) {
    if (isEmpty(modelConfig)) {
      logger.error(`[Download-model] modelConfig is empty.`);
      throw new Error(`[Download-model] modelConfig is empty.`);
    }
  }

  private async _handleOssAutoDeployment(region: IRegion, credential: any) {
    let ossEndpoint = `https://oss-${region}.aliyuncs.com`;
    if (process.env.FC_REGION === region) {
      ossEndpoint = `oss-${region}-internal.aliyuncs.com`;
    }
    logger.info(`ossAuto code to ${ossEndpoint}`);
    const oss = new OSS(region, credential as ICredentials, ossEndpoint);
    const { ossBucket, readOnly, mountDir, bucketPath } = await oss.deploy(
      this.inputs.props.ossMountConfig as string,
    );
    logger.write(
      yellow(`Created oss resource succeeded, please replace ossMountConfig: auto in yaml with:
ossMountConfig:
  mountPoints:
    - mountDir: ${mountDir}
      bucketName: ${ossBucket}
      endpoint: http://oss-${region}-internal.aliyuncs.com
      bucketPath: ${bucketPath}
      readOnly: ${readOnly}\n`),
    );
    this.createResource.oss = { ossBucket };
    _.set(this.local, 'ossMountConfig', {
      mountPoints: [
        {
          mountDir,
          bucketName: ossBucket,
          bucketPath,
          endpoint: `http://oss-${region}-internal.aliyuncs.com`,
          readOnly,
        },
      ],
    });
  }

  private async _handleNasAutoDeployment(
    region: IRegion,
    credential: any,
    nasAuto: boolean,
    vpcAuto: boolean,
    functionName: string,
  ) {
    const client = new VPC_NAS(region, credential as ICredentials);
    const localVpcAuto = _.isString(this.local.vpcConfig) ? undefined : this.local.vpcConfig;
    // @ts-ignore: nas auto 会返回 mountTargetDomain 和 fileSystemId
    const { vpcConfig, mountTargetDomain, fileSystemId } = await client.deploy({
      nasAuto,
      vpcConfig: localVpcAuto,
    });

    if (vpcAuto) {
      const { vSwitchIds } = vpcConfig;
      this._assertArrayOfStrings(vSwitchIds);
      const vSwitchIdsArray: string[] = vSwitchIds as string[];
      logger.write(
        yellow(`[nasAuto] Created vpc resource succeeded, please manually write vpcConfig to the yaml file:
vpcConfig:
  vpcId: ${vpcConfig.vpcId}
  securityGroupId: ${vpcConfig.securityGroupId}
  vSwitchIds:
    - ${vSwitchIdsArray.join('\n    - ')}\n`),
      );
      this.createResource.vpc = vpcConfig;
      _.set(this.local, 'vpcConfig', vpcConfig);
      logger.info('[nasAuto] vpcAuto finished.');
    }

    if (nasAuto) {
      let serverAddr = `${mountTargetDomain}:/${functionName}`;
      if (serverAddr.length > 128) {
        serverAddr = serverAddr.substring(0, 128);
      }
      logger.write(
        yellow(`[nasAuto] Created nas resource succeeded, please replace nasConfig: auto in yaml with:
nasConfig:
groupId: 0
userId: 0
mountPoints:
  - serverAddr: ${serverAddr}
    mountDir: /mnt/${functionName}
    enableTLS: false\n`),
      );
      this.createResource.nas = { mountTargetDomain, fileSystemId };
      _.set(this.local, 'nasConfig', {
        groupId: 0,
        userId: 0,
        mountPoints: [
          {
            serverAddr,
            mountDir: `/mnt/${functionName}`,
            enableTLS: false,
          },
        ],
      });
    }
  }

  private _buildParams(
    modelConfig: any,
    region: string,
    accountID: string,
    nasConfig: any,
    vpcConfig: any,
    ossMountConfig: any,
    functionName: string,
  ) {
    const params: any = {
      modelConfig: {
        model: modelConfig.id,
        source: modelConfig.source,
        uri: modelConfig.source.uri,
        target: modelConfig.target,
        reversion: modelConfig.version,
        files: modelConfig.files,
        conflictResolution: modelConfig?.downloadStrategy?.conflictResolution || 'overwrite',
        mode: process.env.MODEL_DOWNLOAD_STRATEGY || modelConfig?.downloadStrategy?.mode || 'once',
        timeout:
          (modelConfig?.downloadStrategy?.timeout &&
            modelConfig?.downloadStrategy?.timeout * 1000) ||
          MODEL_DOWNLOAD_TIMEOUT,
      },
      region,
      functionName,
      storage: modelConfig.storage,
      // 使用固定的默认角色ARN，确保权限一致性
      role: `acs:ram::${accountID}:role/aliyundevsdefaultrole`,
    };

    if (typeof ossMountConfig === 'object' && ossMountConfig?.mountPoints) {
      params.ossMountPoints = ossMountConfig.mountPoints as OSSMountPoint[];
    }
    if (typeof nasConfig === 'object' && nasConfig?.mountPoints) {
      params.vpcConfig = vpcConfig as VPCConfig;
      params.nasMountPoints = nasConfig.mountPoints;
    }

    return params;
  }
}
