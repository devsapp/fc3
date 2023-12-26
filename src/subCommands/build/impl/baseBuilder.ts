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
} from '../../../default/image';
import { runCommand } from '../../../utils';
import FC from '../../../resources/fc';

export abstract class Builder {
  protected baseDir: string;

  abstract runBuild(): Promise<any>;

  constructor(readonly inputs: IInputs) {
    this.baseDir = inputs.baseDir || process.cwd();
  }

  getProps(): IProps {
    return this.inputs.props;
  }

  getRuntime(): string {
    return this.getProps().runtime;
  }

  getRegion(): IRegion {
    return this.getProps().region;
  }

  getFunctionName(): string {
    return this.getProps().functionName;
  }

  async getCredentials(): Promise<ICredentials> {
    return this.inputs.getCredential();
  }

  getEnv(): Record<string, string> {
    return this.getProps().environmentVariables || {};
  }

  getCodeUri(): string {
    if (!this.checkCodeUri()) {
      return '';
    }
    const codeUri = _.get(this.getProps(), 'code') as ICodeUri;
    const src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(this.baseDir, src);
    return resolvedCodeUri;
  }

  checkCodeUri(): boolean {
    const codeUri = _.get(this.getProps(), 'code') as ICodeUri;
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
      image = this.getProps().customContainerConfig?.image;
      if (_.isEmpty(image)) {
        throw new Error('image must be set in custom-container runtime');
      }
      logger.debug(`use fc docker CustomContainer image: ${image}`);
    } else if (fcDockerUseImage) {
      image = fcDockerUseImage;
      logger.debug(`use fc docker custom image: ${image}`);
    } else {
      let runtime = this.getRuntime();
      if (runtime === 'python3') {
        runtime = 'python3.6';
      }
      image = `${fcDockerVersionRegistry}/${fcDockerNameSpace}/runtime-${runtime}:build-${fcDockerVersion}`;
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
  }

  public async build() {
    const check = this.beforeBuild();
    if (!check) {
      return;
    }
    await this.runBuild();
    this.afterBuild();
  }

  async mockDockerLogin() {
    let imageName = await this.getRuntimeBuildImage();
    const acrInstanceID = await Acr.getAcrEEInstanceID(imageName, await this.getCredentials());
    logger.info(`acrInstanceID: ${acrInstanceID}`);
    this._checkAcreeInstanceID(imageName, acrInstanceID);
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

  protected isAppCenter(): boolean {
    return process.env.BUILD_IMAGE_ENV === 'fc-backend';
  }

  protected isPythonLanguage() {
    // 验证是不是 python
    let isPython = this.getRuntime().startsWith('python');
    const codeUri = this.getCodeUri();
    const isCustom = FC.isCustomRuntime(this.getRuntime());
    logger.debug(`isPython ${isPython}; is custom ${isCustom}`);
    if (isCustom) {
      const requirementsPath = path.join(codeUri, 'requirements.txt');
      const hasRequirements = fs.existsSync(requirementsPath);
      logger.debug(`custom runtime has requirements.txt: ${hasRequirements}`);
      if (hasRequirements) {
        isPython = true;
      }
    }

    logger.debug(`isPython ${isPython}`);
    return isPython;
  }

  protected isNodejsLanguage() {
    // 验证是不是 nodejs
    let isNodejs = this.getRuntime().startsWith('nodejs');
    const codeUri = this.getCodeUri();
    const isCustom = FC.isCustomRuntime(this.getRuntime());
    logger.debug(`isNodejs ${isNodejs}; is custom ${isCustom}`);
    if (isCustom) {
      const packagePath = path.join(codeUri, 'package.json');
      const hasPackage = fs.existsSync(packagePath);
      logger.debug(`custom runtime has package.json: ${hasPackage}`);
      if (hasPackage) {
        isNodejs = true;
      }
    }
    logger.debug(`isNodejs ${isNodejs}`);
    return isNodejs;
  }

  protected isPhpLanguage() {
    // 验证是不是 php
    let isPhp = this.getRuntime().startsWith('php');
    const codeUri = this.getCodeUri();
    const isCustom = FC.isCustomRuntime(this.getRuntime());
    logger.debug(`isNodejs ${isPhp}; is custom ${isCustom}`);
    if (isCustom) {
      const composerPath = path.join(codeUri, 'composer.json');
      const hasComposer = fs.existsSync(composerPath);
      logger.debug(`custom runtime has composer.json: ${hasComposer}`);
      if (hasComposer) {
        isPhp = true;
      }
    }
    logger.debug(`isPhp ${isPhp}`);
    return isPhp;
  }

  private _checkAcreeInstanceID(imageName: string, instanceID: string) {
    // 如果是企业镜像，并且非正常 build 验证，企业镜像配置
    if (Acr.isAcreeRegistry(imageName) && !instanceID) {
      throw new Error(
        'When an enterprise version instance is selected for the container image, you need to add an instanceID to the enterprise version of the container image service. Refer to: https://docs.serverless-devs.com/fc/yaml/function#customcontainerconfig',
      );
    }
  }
}
