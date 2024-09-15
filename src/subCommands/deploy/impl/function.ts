import _ from 'lodash';
import { diffConvertYaml } from '@serverless-devs/diff';
import inquirer from 'inquirer';
import tmpDir from 'temp-dir';
import { v4 as uuidV4 } from 'uuid';
import fs from 'fs';
import assert from 'assert';
import path from 'path';
import { yellow } from 'chalk';
import zip from '@serverless-devs/zip';
import { getRootHome } from '@serverless-devs/utils';

import logger from '../../../logger';
import { IFunction, IInputs } from '../../../interface';
import {
  FC_CLIENT_CONNECT_TIMEOUT,
  FC_CLIENT_READ_TIMEOUT,
  FC_RESOURCES_EMPTY_CONFIG,
} from '../../../default/config';
import Acr from '../../../resources/acr';
import Sls from '../../../resources/sls';
import { RamClient } from '../../../resources/ram';
import FC, { GetApiType } from '../../../resources/fc';
import VPC_NAS from '../../../resources/vpc-nas';
import Base from './base';
import { ICredentials } from '@serverless-devs/component-interface';
import { calculateCRC64, getFileSize, downloadFile } from '../../../utils';
import Devs20230714, * as $Devs20230714 from '@alicloud/devs20230714';
import * as $OpenApi from '@alicloud/openapi-client';
import axios from 'axios';
import OSS from 'ali-oss';

type IType = 'code' | 'config' | boolean;
interface IOpts {
  type?: IType;
  yes?: boolean;
  skipPush?: boolean;
  putArtifact?: boolean;
}

export default class Service extends Base {
  readonly type?: IType;
  readonly skipPush?: boolean = false;
  putArtifact?: boolean = false;

  remote?: any;
  local: IFunction;
  createResource: Record<string, any> = {};
  acr: Acr;
  codeChecksum: string;
  devsClient: Devs20230714;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    const functionName = inputs.props?.functionName;
    if (!functionName) {
      throw new Error(`Function ${functionName} is not defined`);
    }

    this.type = opts.type;
    this.skipPush = opts.skipPush;
    logger.debug(`deploy function type: ${this.type}`);

    this.local = _.cloneDeep(inputs.props);
    _.unset(this.local, 'region');
    _.unset(this.local, 'triggers');
    _.unset(this.local, 'asyncInvokeConfig');
    _.unset(this.local, 'vpcBinding');
    _.unset(this.local, 'artifact');
    _.unset(this.local, 'customDomain');
    _.unset(this.local, 'provisionConfig');

    if (_.isEmpty(this.inputs.props.code) && this.inputs.props.artifact) {
      this.putArtifact = false;
    }
    if (this.inputs.props.code && this.inputs.props.artifact) {
      this.putArtifact = true;
    }
  }

  // 准备动作
  async before() {
    const { AccountID: accountID } = await this.inputs.getCredential();
    try {
      const r = await this.fcSdk.getFunction(this.local.functionName, GetApiType.simple);
      this.codeChecksum = _.get(r, 'codeChecksum', '');
      const remote = _.omit(r, [
        'lastModifiedTime',
        'functionId',
        'createdTime',
        'codeSize',
        'codeChecksum',
        'functionArn',
        'useSLRAuthentication',
      ]);
      this.remote = remote;
    } catch (ex) {
      logger.debug(`Get remote function config error: ${ex.message}`);
    }

    const { local, remote } = await FC.replaceFunctionConfig(this.local, this.remote);
    this.local = local;
    this.remote = remote;
    if (_.isEmpty(this.inputs.props.code) && this.inputs.props.artifact) {
      await this.initDevsClient();
      const { artifact } = this.inputs.props;
      let artifactName = '';
      if (artifact.split('/').length > 1) {
        artifactName = artifact.split('/')[1].split('@')[0];
      } else {
        artifactName = artifact.split('@')[0];
      }
      const downPath: string = path.join(tmpDir, `${artifactName}_${accountID}_${uuidV4()}.zip`);
      this.local.code = downPath;
      if (_.includes(artifactName, '@')) {
        artifactName = artifactName.split('@')[0];
      }

      const downloadArtifact = await this.devsClient.fetchArtifactDownloadUrl(artifactName);
      const downloadUrl = downloadArtifact?.body?.url;
      await downloadFile(downloadUrl, downPath);
    }

    await this._plan();
  }

  async run() {
    if (!this.needDeploy) {
      logger.debug('Detection does not require deployment of function, skipping deployment');
      return;
    }

    // 如果不是仅仅部署代码包，就需要处理一些资源配置
    if (this.type !== 'code') {
      await this._deployAuto();
      logger.debug(`Deploy auto result: ${JSON.stringify(this.local)}`);
      // TODO check nas mount target
      // https://github.com/devsapp/fc-core/blob/master/src/nas/index.ts#L23C23-L23C49
    }

    // 如果不是仅仅部署配置，就需要处理代码
    if (this.type !== 'config') {
      if (!FC.isCustomContainerRuntime(this.local?.runtime)) {
        const ret = await this._uploadCode();
        if (!ret) {
          _.unset(this.local, 'code');
        }
      } else if (!this.skipPush) {
        await this._pushImage();
      }
    }

    // 部署函数
    const config = _.defaults(this.local, FC_RESOURCES_EMPTY_CONFIG);
    await this.fcSdk.deployFunction(config, {
      slsAuto: !_.isEmpty(this.createResource.sls),
      type: this.type,
    });

    let artifact = {};
    if (this.putArtifact) {
      artifact = await this.deployArtifact();
    }

    return { artifact };
  }

  private _getAcr() {
    if (this.acr) {
      return this.acr;
    }
    this.acr = new Acr(this.inputs.props.region, this.inputs.credential as ICredentials);
    return this.acr;
  }

  /**
   * diff 处理
   */
  private async _plan(): Promise<void> {
    // 远端不存在，或者 get 异常跳过 plan 直接部署
    if (!this.remote || this.type === 'code') {
      this.needDeploy = true;
      return;
    }

    _.unset(this.local, 'endpoint');
    const { code } = this.local;
    _.unset(this.local, 'code');
    const local = _.cloneDeep(this.local);
    _.unset(local, 'customContainerConfig.registryConfig');
    const { diffResult, show } = diffConvertYaml(this.remote, local);
    _.set(this.local, 'code', code);

    logger.debug(`function diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`function diff show:\n${show}`);

    let tipsMsg = `Function ${this.local.functionName} was changed, please confirm before deployment:\n`;
    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      if (!FC.isCustomContainerRuntime(this.local.runtime)) {
        this.needDeploy = true;
        return;
      }
    }

    // custom-container 检查 s.yaml 中 image 是否存在 acr 中， 如果存在， 则弹出交互提示
    // --skip-push 则不用提示
    if (FC.isCustomContainerRuntime(this.local.runtime)) {
      const { image } = this.local.customContainerConfig || {};
      if (_.isNil(image)) {
        throw new Error('CustomContainerRuntime must have a valid image URL');
      }
      if (Acr.isAcrRegistry(image)) {
        const isExist = await this._getAcr().checkAcr(image);
        if (!isExist) {
          if (_.isEmpty(diffResult)) {
            this.needDeploy = true;
            return;
          }
        } else {
          // eslint-disable-next-line no-lonely-if
          if (!this.skipPush) {
            tipsMsg = yellow(
              `WARNING: You are pushing ${image} to overwrite an existing image tag.If this image tag is being used by any other functions, subsequent calls to these functions may fail.Please confirm if you want to continue.`,
            );
          } else {
            // eslint-disable-next-line no-lonely-if
            if (_.isEmpty(diffResult)) {
              this.needDeploy = true;
              return;
            }
          }
        }
      }
      logger.write(tipsMsg);
    } else {
      // eslint-disable-next-line no-lonely-if
      if (_.isEmpty(diffResult)) {
        this.needDeploy = true;
        return;
      }
    }

    logger.write(show);
    // 用户指定了 --yes 或者 --no-yes，不再交互
    if (_.isBoolean(this.needDeploy)) {
      return;
    }
    logger.write(
      `\n* You can also specify to use local configuration through --assume-yes/-y during deployment`,
    );
    const message = `Deploy it with local config?`;
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message,
      },
    ]);
    this.needDeploy = answers.ok;
  }

  /**
   * 上传镜像
   */
  private async _pushImage() {
    if (this.skipPush) {
      logger.debug(`skip push is ${this.skipPush}`);
      return;
    }
    const { image } = this.local.customContainerConfig || {};
    if (_.isNil(image)) {
      throw new Error('CustomContainerRuntime must have a valid image URL');
    }
    if (Acr.isAcrRegistry(image)) {
      await this._getAcr().pushAcr(image);
    } else {
      logger.info(
        'By default, the push is skipped if the image is not from an ACR (Aliyun Container Registry) registry.',
      );
    }
  }

  /**
   * 压缩和上传代码包
   */
  private async _uploadCode(): Promise<boolean> {
    const codeUri = this.local.code;
    if (_.isNil(codeUri)) {
      throw new Error('Code config is empty');
    }
    // 支持 ossBucketName / ossObjectName 配置
    if (typeof codeUri !== 'string') {
      if (!(codeUri?.ossBucketName && codeUri?.ossObjectName)) {
        throw new Error(
          'Code config must be a string or an object containing ossBucketName and ossObject Name',
        );
      }
      return true;
    }

    let zipPath: string = path.isAbsolute(codeUri)
      ? codeUri
      : path.join(this.inputs.baseDir, codeUri);
    logger.debug(`Code path absolute path: ${zipPath}`);

    const needZip = this._assertNeedZip(codeUri);
    logger.debug(`Need zip file: ${needZip}`);

    let generateZipFilePath = '';
    if (needZip) {
      const zipConfig = {
        codeUri: zipPath,
        outputFileName: `${this.inputs.props.region}_${this.local.functionName}_${Date.now()}`,
        outputFilePath: path.join(getRootHome(), '.s', 'fc', 'zip'),
        ignoreFiles: ['.fcignore'],
        logger: logger.instance,
      };
      const start = new Date();
      generateZipFilePath = (await zip(zipConfig)).outputFile;
      const end = new Date();
      const milliseconds = end.getTime() - start.getTime();
      logger.debug(`压缩程序执行时间: ${milliseconds / 1000}s`);
      zipPath = generateZipFilePath;
    }
    // logger.debug(`Zip file: ${zipPath}`);
    // debug show zip file size
    getFileSize(zipPath);

    const crc64Value = await calculateCRC64(zipPath);
    logger.debug(`code zip crc64=${crc64Value}; codeChecksum=${this.codeChecksum}`);
    if (this.codeChecksum) {
      if (this.codeChecksum === crc64Value) {
        logger.debug(
          yellow(`skip uploadCode because code is no changed, codeChecksum=${crc64Value}`),
        );
        return false;
      } else {
        logger.debug(`\x1b[33mcodeChecksum from ${this.codeChecksum} to ${crc64Value}\x1b[0m`);
      }
    }
    const ossConfig = await this.fcSdk.uploadCodeToTmpOss(zipPath);
    logger.debug('ossConfig: ', ossConfig);
    _.set(this.local, 'code', ossConfig);

    if (generateZipFilePath) {
      try {
        fs.rmSync(generateZipFilePath);
      } catch (ex) {
        logger.debug(`Unable to remove zip file: ${zipPath}`);
      }
    }

    return true;
  }

  /**
   * 生成 auto 资源，非 FC 资源，主要指 vpc、nas、log、role（oss mount 挂载点才有）
   */
  private async _deployAuto() {
    const { region } = this.inputs.props;
    const { credential } = this.inputs;
    const { functionName } = this.local;

    const { nasAuto, vpcAuto, slsAuto, roleAuto } = FC.computeLocalAuto(this.local);
    logger.debug(
      `Deploy auto compute local auto, nasAuto: ${nasAuto}; vpcAuto: ${vpcAuto}; slsAuto: ${slsAuto}; roleAuto: ${roleAuto}`,
    );

    if (slsAuto) {
      const sls = new Sls(region, credential as ICredentials);
      const { project, logstore } = await sls.deploy();
      logger.write(
        yellow(`Created log resource succeeded, please replace logConfig: auto in yaml with:
logConfig:
  enableInstanceMetrics: true
  enableRequestMetrics: true
  logBeginRule: DefaultRegex
  logstore: ${logstore}
  project: ${project}\n`),
      );
      this.createResource.sls = { project, logstore };
      _.set(this.local, 'logConfig', {
        enableInstanceMetrics: true,
        enableRequestMetrics: true,
        logBeginRule: 'DefaultRegex',
        logstore,
        project,
      });
    }

    if (roleAuto) {
      const client = new RamClient(credential as ICredentials);
      const arn = await client.initFcDefaultServiceRole();
      logger.write(yellow(`Using role: ${arn}\n`));
      this.createResource.role = { arn };

      _.set(this.local, 'role', arn);
    } else if (
      !this.local.role &&
      (nasAuto || vpcAuto || slsAuto || FC.isCustomContainerRuntime(this.local?.runtime))
    ) {
      const client = new RamClient(credential as ICredentials);
      await client.initSlrRole('FC');
    }

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
          yellow(`Created vpc resource succeeded, please manually write vpcConfig to the yaml file:
vpcConfig:
  vpcId: ${vpcConfig.vpcId}
  securityGroupId: ${vpcConfig.securityGroupId}
  vSwitchIds:
    - ${vSwitchIdsArray.join('   - \n')}\n`),
        );
        this.createResource.vpc = vpcConfig;
        _.set(this.local, 'vpcConfig', vpcConfig);
      }
      if (nasAuto) {
        logger.write(
          yellow(`Created nas resource succeeded, please replace nasConfig: auto in yaml with:
nasConfig:
  groupId: 0
  userId: 0
  mountPoints:
    - serverAddr: ${mountTargetDomain}:/${functionName}
      mountDir: /mnt/${functionName}
      enableTLS: false\n`),
        );
        this.createResource.nas = { mountTargetDomain, fileSystemId };
        _.set(this.local, 'nasConfig', {
          groupId: 0,
          userId: 0,
          mountPoints: [
            {
              serverAddr: `${mountTargetDomain}:/${functionName}`,
              mountDir: `/mnt/${functionName}`,
              enableTLS: false,
            },
          ],
        });
      }
    }
  }

  /**
   * 判断是否需要压缩代码
   */
  private _assertNeedZip(codeUri: string): boolean {
    // 如果 .jar 结尾
    //    custom runtime 并且启动命令包含 java -jar 就需要压缩
    //    官方的 runtime，那么不需要压缩
    if (codeUri.endsWith('.jar')) {
      const { runtime } = this.local;
      const command = _.get(this.local, 'customRuntimeConfig.command', []);
      const args = _.get(this.local, 'customRuntimeConfig.args', []);

      const commandStr = `${_.join(command, ' ')} ${_.join(args, ' ')}`;
      if (FC.isCustomRuntime(runtime) && commandStr.includes('java -jar')) {
        return true;
      }
      return false;
    }

    return !(codeUri.endsWith('.zip') || codeUri.endsWith('.war'));
  }

  private _assertArrayOfStrings(variable: any) {
    assert(Array.isArray(variable), 'Variable must be an array');
    assert(
      variable.every((item) => typeof item === 'string'),
      'Variable must contain only strings',
    );
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  public async deployArtifact() {
    const { runtime, functionName } = this.inputs.props;
    if (!FC.isCustomContainerRuntime(runtime)) {
      const { artifact } = this.inputs.props;
      let artifactName = '';
      if (artifact.split('/').length > 1) {
        artifactName = artifact.split('/')[1].split('@')[0];
      } else {
        artifactName = artifact.split('@')[0];
      }
      logger.info(`putArtifact ${artifactName}`);
      await this.initDevsClient();
      const { url } = await this.fcSdk.getFunctionCode(functionName, 'LATEST');
      // const truncateString = (s: string) => (s.length > 64 ? s.substring(0, 64) : s);
      // const artifactName = truncateString(`${functionName}_${region}`);

      const downloadDir: string = path.join(tmpDir, 'artifacts');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir);
      }
      const zipFile = path.join(downloadDir, `${artifactName}_${uuidV4()}.zip`);

      logger.debug(`download ${url} to ${zipFile}`);
      await downloadFile(url, zipFile);

      const resp = await this.devsClient.fetchArtifactTempBucketToken();
      logger.debug(JSON.stringify(resp.body));
      const { credentials, ossRegion, ossBucketName, ossObjectName } = resp.body;
      let ossEndpoint = 'https://oss-accelerate.aliyuncs.com';
      if (ossRegion.endsWith(process.env.FC_REGION)) {
        ossEndpoint = `oss-${process.env.FC_REGION}-internal.aliyuncs.com`;
      }
      const ossClient = new OSS({
        endpoint: ossEndpoint,
        accessKeyId: credentials.accessKeyId,
        accessKeySecret: credentials.accessKeySecret,
        stsToken: credentials.securityToken,
        bucket: ossBucketName,
        timeout: '600000', // 10min
        refreshSTSToken: async () => {
          const refreshToken = await axios.get('https://127.0.0.1/sts');
          return {
            accessKeyId: refreshToken.data.credentials.AccessKeyId,
            accessKeySecret: refreshToken.data.credentials.AccessKeySecret,
            stsToken: refreshToken.data.credentials.SecurityToken,
          };
        },
      });
      const r = await (ossClient as any).put(ossObjectName, zipFile);
      logger.debug(JSON.stringify(r));

      const ossUri = `oss://${ossRegion.substring(4)}/${ossBucketName}/${ossObjectName}`;
      const input = new $Devs20230714.Artifact({
        name: artifactName,
        description: 'artifact create by serverless-devs artifact command',
        spec: new $Devs20230714.ArtifactSpec({
          uri: ossUri,
          type: 'fc',
          runtime,
        }),
      });
      logger.debug('create artifact...');
      try {
        const createArtifactRequest = new $Devs20230714.CreateArtifactRequest({ body: input });
        const r2 = await this.devsClient.createArtifact(createArtifactRequest);
        logger.debug(JSON.stringify(r2.body));
        const { arn, checksum } = r2.body.status;
        return {
          artifact: `${arn}@${checksum}`,
        };
      } catch (error) {
        if (error.message.includes('ArtifactAlreadyExists')) {
          logger.debug('update artifact...');
          const putArtifactRequest = new $Devs20230714.PutArtifactRequest({
            body: input,
            force: true,
          });
          const r3 = await this.devsClient.putArtifact(artifactName, putArtifactRequest);
          logger.debug(JSON.stringify(r3.body));
          const { arn, checksum } = r3.body.status;
          return {
            artifact: `${arn}@${checksum}`,
          };
        } else {
          logger.error(error.message);
          throw error;
        }
      }
    }
    logger.info('skip putArtifact because custom container runtime');
    return {};
  }

  private async initDevsClient() {
    const {
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = await this.inputs.getCredential();
    const config = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      readTimeout: FC_CLIENT_READ_TIMEOUT,
      connectTimeout: FC_CLIENT_CONNECT_TIMEOUT,
    });
    config.endpoint = 'devs.cn-hangzhou.aliyuncs.com';
    if (process.env.ARTIFACT_ENDPOINT) {
      config.endpoint = process.env.ARTIFACT_ENDPOINT;
    }
    if (process.env.artifact_endpoint) {
      config.endpoint = process.env.artifact_endpoint;
    }
    this.devsClient = new Devs20230714(config);
  }
}
