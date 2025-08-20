import { IFunction, IInputs } from '../../interface';
import logger from '../../logger';
import _, { isEmpty } from 'lodash';
import FC from '../../resources/fc';
import VPC_NAS from '../../resources/vpc-nas';
import { ICredentials } from '@serverless-devs/component-interface';
import { yellow } from 'chalk';
import DevClient, * as devs from '@alicloud/devs20230714';
import * as $OpenApi from '@alicloud/openapi-client';
import { getEnvVariable } from '../../default/resources';
import commandsHelp from '../../commands-help/layer';
import { parseArgv } from '@serverless-devs/utils';
import assert from 'assert';
import { sleep } from '../../utils';

export const NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT as string, 10) || 10 * 1000;
export const NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT: number =
  parseInt(process.env.NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT as string, 10) || 86400 * 1000;
export const MODEL_DOWNLOAD_TIMEOUT: number =
  parseInt(process.env.MODEL_DOWNLOAD_TIMEOUT as string, 10) || 42 * 60 * 1000;

const commandsList = Object.keys(commandsHelp.subCommands);

export class Model {
  readonly subCommand: string;
  createResource: Record<string, any> = {};
  logger = logger;
  local: IFunction;
  projectName: string;
  envName: string;

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
  }

  async download() {
    // 1. auto ---> auto 包， 有 nasConfig
    // 2. 调用 download 接口，若返回一个错误是下载服务已经存在，继续等待 get 轮询。
    // 3. 轮询 get 接口
    const { credential } = this.inputs;
    const { region, supplement, annotations } = this.inputs.props;
    const { functionName } = this.local;
    const modelConfig = supplement?.modelConfig || annotations?.modelConfig;

    if (isEmpty(modelConfig)) {
      logger.error(`[Download-model] modelConfig is empty.`);
      throw new Error(`[Download-model] modelConfig is empty.`);
    }

    logger.info(`[Download-model] Download model start.`);

    // 混合更多因子，防止重复
    const projectName = getEnvVariable('ALIYUN_DEVS_REMOTE_PROJECT_NAME');
    const envName = getEnvVariable('ALIYUN_DEVS_REMOTE_ENV_NAME');

    this.projectName = projectName;
    this.envName = envName;
    const name = `${projectName}$${envName}$${functionName}`;

    const { nasAuto, vpcAuto } = FC.computeLocalAuto(this.local);
    logger.debug(`[nasAuto] Auto compute local auto, nasAuto: ${nasAuto};`);
    if (nasAuto || vpcAuto) {
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
    - ${vSwitchIdsArray.join('   - \n')}\n`),
        );
        this.createResource.vpc = vpcConfig;
        _.set(this.local, 'vpcConfig', vpcConfig);
        logger.info('[nasAuto] vpcAuto finished.');
      }
      if (nasAuto) {
        logger.write(
          yellow(`[nasAuto] Created nas resource succeeded, please replace nasConfig: auto in yaml with:
nasConfig:
groupId: 0
userId: 0
mountPoints:
  - serverAddr: ${mountTargetDomain}:/${functionName}/${modelConfig.id}
    mountDir: /mnt/${functionName}
    enableTLS: false\n`),
        );
        this.createResource.nas = { mountTargetDomain, fileSystemId };
        _.set(this.local, 'nasConfig', {
          groupId: 0,
          userId: 0,
          mountPoints: [
            {
              serverAddr: `${mountTargetDomain}:/${functionName}/${modelConfig.id}`,
              mountDir: `/mnt/${functionName}`,
              enableTLS: false,
            },
          ],
        });
      }
    }

    // downloadModel
    const devClient = await this.getNewModelServiceClient();

    if (devClient) {
      const { nasConfig, vpcConfig } = this.local;
      logger.debug(`[Download-model] nasConfig: ${nasConfig} vpcConfig: ${vpcConfig}`);
      const { nasMountDomain, nasMountPath } = this.parseNasConfig(nasConfig);
      let resp;
      if (typeof nasConfig === 'object' && nasConfig?.mountPoints) {
        const params = {
          modelConfig: {
            model: modelConfig.id,
            type: modelConfig.source,
            reversion: modelConfig.version,
            token: modelConfig.token,
            bucket: modelConfig.ossBucket,
            path: modelConfig.ossPath,
            region: modelConfig.ossRegion,
          },
          region,
          modelPath: nasMountPath,
          role: modelConfig.role,
          nasMountPoint: nasMountDomain,
          vpcConfig,
        };
        try {
          const req = new devs.DownloadModelRequest(params);
          logger.debug(req);
          resp = await devClient.downloadModel(name, req);
          logger.debug(resp);
        } catch (e) {
          logger.error(`download model invocation error: ${e.message}`);
          throw new Error(`download model error: ${e.message}`);
        }

        if (resp.statusCode != 200 && resp.statusCode != 202) {
          logger.info({ status: resp.statusCode, body: resp.body });
          throw new Error(
            `download model connection error, statusCode: ${resp.statusCode}, body: ${resp.body}`,
          );
        }

        const rb = resp.body;
        if (rb.success || rb.errMsg.includes('is already exist')) {
          logger.info(`download model requestId: ${rb.requestId}`);
          while (true) {
            const modelStatus = await this.getModelStatus(devClient, name);

            if (modelStatus.finished) {
              const durationMs = modelStatus.finishedTime - modelStatus.startTime;
              logger.warn(`Time taken for model download: ${durationMs}.`);
              logger.info(`[Download-model] Download model finished.`);
              return true;
            }

            if (Date.now() - modelStatus.startTime > MODEL_DOWNLOAD_TIMEOUT) {
              const errorMessage = `[Model-download] Download timeout after ${
                MODEL_DOWNLOAD_TIMEOUT / 1000 / 60
              } minutes`;
              throw new Error(errorMessage);
            }

            logger.warn(`[Download-model] Download task not finished yet, polling in 10 seconds`);
            await sleep(10);
          }
        } else {
          throw new Error(
            `download model service biz failed, errCode: ${rb.errCode}, errMsg: ${rb.errMsg}`,
          );
        }
      }
    }
  }

  async getNewModelServiceClient(): Promise<DevClient> {
    const {
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = await this.inputs.getCredential();

    let endpoint: string;

    endpoint = 'devs.cn-hangzhou.aliyuncs.com';
    if (process.env.ARTIFACT_ENDPOINT) {
      endpoint = process.env.ARTIFACT_ENDPOINT;
    }
    if (process.env.artifact_endpoint) {
      endpoint = process.env.artifact_endpoint;
    }

    const protocol = 'https';

    const config = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT,
      connectTimeout: NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT,
      userAgent: `${
        this.inputs.userAgent ||
        `Component:cap-model;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }`,
    });

    logger.info(`new models service init, ARTIFACT_ENDPOINT endpoint: ${config.endpoint}`);

    return new DevClient(config);
  }

  private _assertArrayOfStrings(variable: any) {
    assert(Array.isArray(variable), 'Variable must be an array');
    assert(
      variable.every((item) => typeof item === 'string'),
      'Variable must contain only strings',
    );
  }

  async getModelStatus(client: DevClient, name: string) {
    let resp;
    try {
      resp = await client.getModelStatus(name);
      logger.debug(resp);
    } catch (e) {
      logger.error(`[Download-model] get model status error: ${e.message} for model ${name}`);
      throw new Error(`[Download-model] get model status error: ${e.message} for model ${name}`);
    }

    if (resp.statusCode != 200 && resp.statusCode != 202) {
      logger.info({ status: resp.statusCode, body: resp.body });
      throw new Error(
        `[Download-model] get model status connection error, statusCode: ${resp.statusCode}, body: ${resp.body}`,
      );
    }

    const rb = resp.body;
    if (rb.success) {
      return rb.data;
    } else {
      throw new Error(
        `[Download-model] get model status biz failed, errCode: ${rb.errCode}, errMsg: ${rb.errMsg}`,
      );
    }
  }

  private parseNasConfig(nasConfig: any) {
    let nasMountDomain: string;
    let nasMountPath = '';

    const { serverAddr } = nasConfig.mountPoints[0];
    const parts = serverAddr.split(':', 2);

    if (parts.length === 2) {
      [nasMountDomain, nasMountPath] = parts;
    } else {
      throw new Error('nasConfig serverAddr string does not contain a colon');
    }

    return { nasMountDomain, nasMountPath };
  }

  async remove() {
    logger.info('[Remove-model] remove model ...');
    const { functionName } = this.inputs.props;
    const projectName = getEnvVariable('ALIYUN_DEVS_REMOTE_PROJECT_NAME');
    const envName = getEnvVariable('ALIYUN_DEVS_REMOTE_ENV_NAME');
    const name = `${projectName}$${envName}$${functionName}`;

    const devClient = await this.getNewModelServiceClient();

    try {
      const resp = await devClient.deleteModel(name);
      logger.debug(resp);

      if (resp.statusCode !== 200 && resp.statusCode !== 202) {
        logger.info({ status: resp.statusCode, body: resp.body });
        throw new Error(
          `[Remove-model] delete model connection error, statusCode: ${resp.statusCode}, body: ${resp.body}`,
        );
      }

      const rb = resp.body;
      if (rb.success) {
        logger.info(`[Remove-model] delete model requestId: ${rb.requestId}`);
        logger.info(`[Remove-model] Remove model succeeded.`);
        return true;
      } else {
        throw new Error(
          `[Remove-model] delete model service biz failed, errCode: ${rb.errCode}, errMsg: ${rb.errMsg}`,
        );
      }
    } catch (e) {
      logger.error(`[Remove-model] delete model invocation error: ${e.message}`);
      throw new Error(`[Remove-model] delete model error: ${e.message}`);
    }
  }
}
