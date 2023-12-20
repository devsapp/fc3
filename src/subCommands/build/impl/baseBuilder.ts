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
    const tipEnvs: string[] = [];

    const libPath = this._afterTipLibPath();
    if (libPath) {
      tipEnvs.push(libPath);
    }

    const pythonPath = this._afterTipPython();
    if (pythonPath) {
      tipEnvs.push(pythonPath);
    }

    const p = this._afterTipPath();
    if (p) {
      tipEnvs.push(p);
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

  private _checkAcreeInstanceID(imageName: string, instanceID: string) {
    // 如果是企业镜像，并且非正常 build 验证，企业镜像配置
    if (Acr.isAcreeRegistry(imageName) && !instanceID) {
      throw new Error(
        'When an enterprise version instance is selected for the container image, you need to add an instanceID to the enterprise version of the container image service. Refer to: https://docs.serverless-devs.com/fc/yaml/function#customcontainerconfig',
      );
    }
  }

  // 针对 python 友好提示
  private _afterTipPython(): string | undefined {
    if (!this._isPythonLanguage()) {
      return;
    }
    const { PYTHONPATH } = this.getEnv();

    logger.debug(`PYTHONPATH ${PYTHONPATH}`);
    if (PYTHONPATH === `/code/${buildPythonLocalPath}`) {
      return;
    }

    return `PYTHONPATH: /code/${buildPythonLocalPath}`;
  }

  private _afterTipPath(): string | undefined {
    let needTipPath = false;
    let defaultPath =
      '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/code:/code/bin:/opt:/opt/bin';
    let PATH = this.getEnv().PATH || defaultPath;
    const isPython = this._isPythonLanguage();
    const codeUri = this.getCodeUri();

    if (isPython) {
      const packagesBin = path.join(codeUri, buildPythonLocalPath, 'bin');
      const hasBin = fs.existsSync(packagesBin) && fs.lstatSync(packagesBin).isDirectory();
      const pathNotFoundBin = !PATH.includes(`/code/${buildPythonLocalPath}/bin`);
      logger.debug(`hasBin ${hasBin}; !PATH.includes = ${pathNotFoundBin}`);
      if (hasBin && pathNotFoundBin) {
        PATH = `/code/${buildPythonLocalPath}/bin:${PATH}`;
        needTipPath = true;
      }
    }

    if (this.existManifest('apt-get.list') && !PATH.includes('/code/apt-archives/usr/bin')) {
      PATH = `/code/apt-archives/usr/bin:${PATH}`;
      needTipPath = true;
    }

    return needTipPath ? `PATH: ${PATH}` : undefined;
  }

  private _afterTipLibPath(): string | undefined {
    const { LD_LIBRARY_PATH } = this.getEnv();
    if (this.existManifest('apt-get.list')) {
      if (!LD_LIBRARY_PATH) {
        const libPaths = [
          '/code/apt-archives/usr/local/lib',
          '/code/apt-archives/usr/lib',
          '/code/apt-archives/usr/lib/x86_64-linux-gnu',
          '/code/apt-archives/usr/lib64',
          '/code/apt-archives/lib',
          '/code/apt-archives/lib/x86_64-linux-gnu',
          '/code',
        ];
        return `LD_LIBRARY_PATH: ${libPaths.join(':')}`;
      }
    }
    return '';
  }

  private _isPythonLanguage() {
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
    return isPython;
  }
}
