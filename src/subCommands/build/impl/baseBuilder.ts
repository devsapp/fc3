import { ICredentials } from '@serverless-devs/component-interface';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';

import { ICodeUri, IInputs, IProps, IRegion } from '../../../interface';
import Acr, { mockDockerConfigFile } from '../../../resources/acr';
import logger from '../../../logger';
import {
  fcDockerVersion,
  fcDockerNameSpace,
  fcDockerVersionRegistry,
  fcDockerUseImage,
  buildPythonLocalPath,
} from '../../../default/image';
import { runCommand } from '../../../utils';
import FC from '../../../resources/fc';
import chalk from 'chalk';

export abstract class Builder {
  inputProps: IInputs;
  private baseDir: string;

  constructor(inputs: IInputs) {
    this.inputProps = inputs;
    this.baseDir = inputs.baseDir || process.cwd();
  }

  getProps(): IProps {
    return this.inputProps.props;
  }

  getRuntime(): string {
    return this.getProps().function.runtime;
  }

  getRegion(): IRegion {
    return this.getProps().region;
  }

  async getCredentials(): Promise<ICredentials> {
    return this.inputProps.getCredential();
  }

  getAcrEEInstanceID(): string {
    return _.get(this.getProps(), 'function.customContainerConfig.acrInstanceID');
  }

  getEnv(): Record<string, string> {
    return this.getProps().function.environmentVariables || {};
  }

  getCodeUri(): string {
    if (!this.checkCodeUri()) {
      return '';
    }
    const codeUri = _.get(this.inputProps, 'props.function.code') as ICodeUri;
    const src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(this.baseDir, src);
    return resolvedCodeUri;
  }

  checkCodeUri(): boolean {
    const codeUri = _.get(this.inputProps, 'props.function.code') as ICodeUri;
    if (!codeUri) {
      logger.warn('Code config is not available');
      return false;
    }
    const src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    if (!src) {
      logger.info('No Src configured, skip building.');
      return false;
    }

    if (_.endsWith(src, '.zip') || _.endsWith(src, '.jar') || _.endsWith(src, '.war')) {
      logger.info('Artifact configured, skip building.');
      return false;
    }
    return true;
  }

  async getRuntimeBuildImage(): Promise<string> {
    let image: string;
    if (FC.isCustomContainerRuntime(this.getRuntime())) {
      image = Acr.vpcImage2InternetImage(this.getProps().function.customContainerConfig?.image);
      logger.debug(`use fc docker CustomContainer image: ${image}`);
    } else if (fcDockerUseImage) {
      image = fcDockerUseImage;
      logger.debug(`use fc docker custom image: ${image}`);
    } else {
      image = `${fcDockerVersionRegistry}/${fcDockerNameSpace}/runtime-${this.getRuntime()}:build-${fcDockerVersion}`;
      logger.debug(`use fc docker image: ${image}`);
      await runCommand(`docker pull ${image}`, runCommand.showStdout.inherit);
    }

    return image;
  }

  beforeBuild(): boolean {
    logger.debug('beforeBuild ...');
    const codeUriValid = this.checkCodeUri();
    logger.debug(`checkCodeUri = ${codeUriValid}`);
    if (!codeUriValid) {
      return false;
    }
    logger.debug(`codeUri = ${this.getCodeUri()}`);
    return true;
  }

  afterBuild() {
    logger.debug('afterBuild ...');
    const tipEnvs: string[] = [];
    this.afterTipPython(tipEnvs);

    if (!this.getEnv().LD_LIBRARY_PATH && this.existManifest('apt-get.list')) {
      const libPaths = [
        "/code/apt-archives/usr/local/lib",
        "/code/apt-archives/usr/lib",
        "/code/apt-archives/usr/lib/x86_64-linux-gnu",
        "/code/apt-archives/usr/lib64",
        "/code/apt-archives/lib",
        "/code/apt-archives/lib/x86_64-linux-gnu",
        "/code"
      ];
      tipEnvs.push(`LD_LIBRARY_PATH: ${libPaths.join(':')}`);
    }

    if (!_.isEmpty(tipEnvs)) {
      logger.info(
        'You need to add a new configuration env configuration dependency in yaml to take effect. The configuration is as follows:',
      );
      logger.write(
        chalk.yellow(`environmentVariables:
  ${tipEnvs.join('\n  ')}
`),
      );
    }
  }

  abstract runBuild(): Promise<any>;

  public async build() {
    const check = this.beforeBuild();
    if (!check) {
      return;
    }
    await this.runBuild();
    this.afterBuild();
  }

  private checkAcreeInstanceID(imageName: string, instanceID: string) {
    // 如果是企业镜像，并且非正常 build 验证，企业镜像配置
    if (Acr.isAcreeRegistry(imageName) && !instanceID) {
      throw new Error(
        'When an enterprise version instance is selected for the container image, you need to add an instanceID to the enterprise version of the container image service. Refer to: https://docs.serverless-devs.com/fc/yaml/function#customcontainerconfig',
      );
    }
  }

  async mockDockerLogin() {
    const acrInstanceID = this.getAcrEEInstanceID();
    logger.info(`acrInstanceID: ${acrInstanceID}`);
    let imageName = await this.getRuntimeBuildImage();
    this.checkAcreeInstanceID(imageName, acrInstanceID);
    const credential = await this.getCredentials();
    await mockDockerConfigFile(this.getRegion(), imageName, credential, acrInstanceID);
    logger.info('docker login successed with cr_tmp user!');
  }

  existManifest(fileName: string): boolean {
    const filePath = path.join(this.getCodeUri(), fileName);
    if (fs.existsSync(filePath)) {
      logger.debug(`${filePath} exist`);
      return true;
    }
    return false;
  }

  // 针对 python 友好提示
  private afterTipPython(tipEnvs: string[]): string[] {
    // 验证是不是 python
    let isPython = this.getRuntime().startsWith('python');
    const codeUri = this.getCodeUri();
    const isCustom = FC.isCustomRuntime(this.getRuntime());
    logger.debug(`isPython ${isPython}; is custom ${isCustom}`);
    if (isCustom) {
      const requirementsPath = path.join(codeUri, 'requirements.txt');
      const hasRequirements = fs.existsSync(requirementsPath);
      logger.debug(`custom runtime has requirements file: ${hasRequirements}`);
      if (hasRequirements) {
        isPython = true;
      }
    }

    logger.debug(`isPython ${isPython}`);
    if (!isPython) {
      return tipEnvs;
    }

    const { PYTHONPATH, PATH = '$PATH' } = this.getEnv();

    const packagesBin = path.join(codeUri, buildPythonLocalPath, 'bin');
    const hasBin = fs.existsSync(packagesBin) && fs.lstatSync(packagesBin).isDirectory();
    const pathNotFoundBin = !PATH.includes(`/code/${buildPythonLocalPath}/bin`);
    logger.debug(`hasBin ${hasBin}; !PATH.includes = ${pathNotFoundBin}`);
    if (hasBin && pathNotFoundBin) {
      tipEnvs.push(`PATH: /code/${buildPythonLocalPath}/bin:${PATH}`);
    }

    logger.info(`PYTHONPATH ${PYTHONPATH}`);
    if (PYTHONPATH !== `/code/${buildPythonLocalPath}`) {
      tipEnvs.push(`PYTHONPATH: /code/${buildPythonLocalPath}`);
    }

    return tipEnvs;
  }
}
