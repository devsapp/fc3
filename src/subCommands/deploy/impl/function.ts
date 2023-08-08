import _ from 'lodash';
import { diffConvertYaml } from '@serverless-devs/diff';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { yellow } from 'chalk';
import zip from '@serverless-devs/zip';
import { getRootHome } from '@serverless-devs/utils';

import logger from '../../../logger';
import { IFunction, IInputs } from '../../../interface';
import { FUNCTION_DEFAULT_CONFIG, FC_RESOURCES_EMPTY_CONFIG } from '../../../default/config';
import Acr from '../../../resources/acr';
import Sls from '../../../resources/sls';
import Ram from '../../../resources/ram';
import FC, { GetApiType } from '../../../resources/fc';
import VPC_NAS from '../../../resources/vpc-nas';
import Base from './base';
import { ICredentials } from '@serverless-devs/component-interface';

type IType = 'code' | 'config' | boolean;
interface IOpts {
  type?: IType;
  yes?: boolean;
  skipPush?: boolean;
}

export default class Service extends Base {
  readonly type?: IType;
  readonly skipPush?: boolean = false;

  remote?: any;
  local: IFunction;
  createResource: Record<string, any> = {};

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);

    this.type = opts.type;
    this.skipPush = opts.skipPush;
    logger.debug(`deploy function type: ${this.type}`);

    this.local = _.cloneDeep(inputs.props.function);
  }

  // 准备动作
  async before() {
    try {
      const remote = await this.fcSdk.getFunction(
        this.local.functionName,
        GetApiType.simpleUnsupported,
      );
      this.remote = remote;
    } catch (ex) {
      logger.debug(`Get remote function config error: ${ex.message}`);
    }

    const { local, remote } = await FC.replaceFunctionConfig(this.local, this.remote);
    this.local = local;
    this.remote = remote;
    await this.plan();
  }

  async run() {
    if (!this.needDeploy) {
      logger.debug('Detection does not require deployment of function, skipping deployment');
      return;
    }

    // 如果不是仅仅部署代码包，就需要处理一些资源配置
    if (this.type !== 'code') {
      await this.deployAuto();
      logger.debug(`Deploy auto result: ${JSON.stringify(this.local)}`);
    }

    // 如果不是仅仅部署配置，就需要处理代码
    if (this.type !== 'config') {
      if (!FC.isCustomContainerRuntime(this.local?.runtime)) {
        await this.uploadCode();
      } else if (!this.skipPush) {
        await this.pushImage();
      }
    }

    // 部署函数
    const config = _.defaults(this.local, FC_RESOURCES_EMPTY_CONFIG);
    await this.fcSdk.deployFunction(config, {
      slsAuto: !_.isEmpty(this.createResource.sls),
      type: this.type,
    });
  }

  /**
   * diff 处理
   */
  private async plan(): Promise<void> {
    // 远端不存在，或者 get 异常跳过 plan 直接部署
    if (!this.remote || this.type === 'code') {
      this.needDeploy = true;
      return;
    }

    const code = this.local.code;
    _.unset(this.local, 'code');
    const { diffResult, show } = diffConvertYaml(this.remote, this.local);
    _.set(this.local, 'code', code);

    logger.debug(`diff result: ${JSON.stringify(diffResult)}`);
    logger.debug(`diff show:\n${show}`);
    // 没有差异，直接部署
    if (_.isEmpty(diffResult)) {
      this.needDeploy = true;
      return;
    }
    logger.write(
      `Function ${this.local.functionName} was changed, please confirm before deployment:\n`,
    );
    logger.write(show);
    // 用户指定了 --yes 或者 --no-yes，不再交互
    if (_.isBoolean(this.needDeploy)) {
      return;
    }
    logger.write(
      `\n* You can also specify to use local configuration through --yes/-y during deployment`,
    );
    const message = `Deploy it with local config or skip deploy function?`;
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
  private async pushImage() {
    if (this.skipPush) {
      logger.debug(`skip push is ${this.skipPush}`);
      return;
    }
    const { image, acrInstanceID } = this.local.customContainerConfig || {};
    if (_.isNil(image)) {
      throw new Error('CustomContainerRuntime must have a valid image URL');
    }
    logger.spin('creating', 'Acr', image);
    const acr = new Acr(this.inputs.props.region, this.inputs.credential as ICredentials);
    await acr.pushAcr(image, acrInstanceID);
    logger.spin('created', 'Acr', image);
  }

  /**
   * 压缩和上传代码包
   */
  private async uploadCode() {
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
      return;
    }

    let zipPath: string = path.isAbsolute(codeUri)
      ? codeUri
      : path.join(this.inputs.baseDir, codeUri);
    logger.debug(`Code path absolute path: ${zipPath}`);

    const needZip = this.assertNeedZip(codeUri);
    logger.debug(`Need zip file: ${needZip}`);

    let generateZipFilePath: string = '';
    if (needZip) {
      const zipConfig = {
        codeUri: zipPath,
        outputFileName: `${this.inputs.props.region}_${this.local.functionName}_${Date.now()}`,
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
    _.set(this.local, 'code', ossConfig);

    if (generateZipFilePath) {
      try {
        fs.rmSync(generateZipFilePath);
      } catch (ex) {
        logger.debug(`Unable to remove zip file: ${zipPath}`);
      }
    }
  }

  /**
   * 生成 auto 资源
   */
  private async deployAuto() {
    const region = this.inputs.props.region;
    const credential = this.inputs.credential;
    const functionName = this.local.functionName;

    const { nasAuto, vpcAuto, slsAuto, roleAuto } = FC.computeLocalAuto(this.local);
    logger.debug(
      `Deploy auto compute local auto, nasAuto: ${nasAuto}; vpcAuto: ${vpcAuto}; slsAuto: ${slsAuto}; roleAuto: ${roleAuto}`,
    );

    if (slsAuto) {
      const sls = new Sls(region, credential as ICredentials);
      const { project, logstore } = await sls.deploy();
      logger.info(
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
      const client = new Ram(credential as ICredentials).client;
      const arn = await client.initFcDefaultServiceRole();
      logger.info(yellow(`Using role: ${arn}\n`));
      this.createResource.role = { arn };

      _.set(this.local, 'role', arn);
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
        logger.info(
          yellow(`Created vpc resource succeeded, please manually write vpcConfig to the yaml file:
vpcConfig:
  vpcId: ${vpcConfig.vpcId}
  securityGroupId: ${vpcConfig.securityGroupId}
  vSwitchIds:
    - ${vpcConfig.vSwitchIds.join('   - \n')}\n`),
        );
        this.createResource.vpc = vpcConfig;
        _.set(this.local, 'vpcConfig', vpcConfig);
      }

      if (nasAuto) {
        logger.info(
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
  private assertNeedZip(codeUri: string): boolean {
    // 如果 .jar 结尾
    //    custom runtime 并且启动命令包含 java -jar 就需要压缩
    //    官方的 runtime，那么不需要压缩
    if (codeUri.endsWith('.jar')) {
      const runtime = this.local.runtime;
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
}
