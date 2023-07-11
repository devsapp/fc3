import path from 'path';
import _ from 'lodash';
import { v4 as uuidV4 } from 'uuid';
import extract from 'extract-zip';
import tmpDir from 'temp-dir';
import * as fs from 'fs-extra';
import * as rimraf from 'rimraf';
import { parseArgv } from '@serverless-devs/utils'
import { ICredentials } from '@serverless-devs/component-interface';
import { getTimeZone, vpcImage2InternetImage } from './utils';
import logger from '../../../common/logger';
import { ICodeUri } from '../../../interface';
import { defaultFcDockerVersion, IDE_VSCODE } from '../../../constant';
import { IInputs } from '../../../interface';

export class BaseLocal {
  protected inputProps: IInputs;
  protected defaultDebugArgs: string;
  protected _argsData: object;
  protected unzippedCodeDir?: string;
  constructor(props: IInputs) {
    this.inputProps = props;
  }

  getProps(): any {
    return this.inputProps.props;
  }

  getArgsData(): object {
    if (!_.isEmpty(this._argsData)) {
      return this._argsData;
    }
    const parsedArgs: { [key: string]: any } = parseArgv(this.inputProps.args, {
      string: ['event'],
      alias: { event: 'e' },
    });
    const argsData: any = parsedArgs?.data || {};
    logger.debug(`argsData ====> ${JSON.stringify(argsData)})`);
    this._argsData = argsData;
    return this._argsData;
  }

  getFunctionProps(): any {
    return this.inputProps.props.function;
  }

  getFunctionTriggers(): any {
    return this.inputProps.props.triggers;
  }

  getRuntime(): string {
    return this.getFunctionProps().runtime;
  }

  getFunctionName(): string {
    return this.getFunctionProps().name;
  }

  getCaPort(): number {
    return (this.getFunctionProps().caPort as number) || 9000;
  }

  getHandler(): string {
    let handler = this.getFunctionProps().handler;
    if (this.getRuntime().startsWith('custom') && handler == undefined) {
      handler = 'index.handler';
    }
    return handler;
  }

  getTimeout(): number {
    return this.getFunctionProps().timeout as number;
  }

  getInitializer(): string {
    return this.getFunctionProps().initializer;
  }

  getInitializerTimeout(): number {
    return this.getFunctionProps().initializerTimeout as number;
  }

  getMemorySize(): number {
    return (this.getFunctionProps().memorySize as number) || 128;
  }

  getRegion(): string {
    return this.getProps().region;
  }

  async getCredentials(): Promise<ICredentials> {
    return await this.inputProps.getCredential();
  }

  getAcrEEInstanceID(): string {
    return _.get(this.getFunctionProps().customContainerConfig.acrInstanceID);
  }

  isHttpFunction(): boolean {
    return this.getFunctionTriggers()?.[0].type === 'http';
  }

  isCustomContainerRuntime(): boolean {
    return this.getFunctionProps().runtime === 'custom-container';
  }

  async getCodeUri(): Promise<string> {
    if (this.unzippedCodeDir) {
      return this.unzippedCodeDir;
    }
    const codeUri = this.getFunctionProps().codeUri;
    let src: string = _.isString(codeUri)
      ? (codeUri as string)
      : ((codeUri as ICodeUri).src as string);

    if (_.endsWith(src, '.zip') || _.endsWith(src, '.jar') || _.endsWith(src, '.war')) {
      const tmpCodeDir: string = path.join(tmpDir, uuidV4());
      await fs.ensureDir(tmpCodeDir);
      logger.log(`codeUri is a zip format, will unzipping to ${tmpCodeDir}`);
      await extract(src, { dir: tmpCodeDir });
      this.unzippedCodeDir = tmpCodeDir;
      return tmpCodeDir;
    } else {
      const baseDir = process.cwd();
      const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(baseDir, src);
      return resolvedCodeUri;
    }
  }

  checkCodeUri(): boolean {
    const codeUri = this.getFunctionProps().codeUri;
    if (!codeUri) {
      return false;
    }
    const src: string = _.isString(codeUri)
      ? (codeUri as string)
      : ((codeUri as ICodeUri).src as string);
    if (!src) {
      logger.info('No Src configured');
      return false;
    }
    return true;
  }

  getRuntimeRunImage(): string {
    if (this.isCustomContainerRuntime()) {
      let image = vpcImage2InternetImage(this.getFunctionProps().customContainerConfig.image);
      return image;
    } else {
      // TODO, use fc.conf
      const fcDockerV = defaultFcDockerVersion;
      let image = `aliyunfc/runtime-${this.getRuntime()}:${fcDockerV}`;
      if (getTimeZone() === 'UTC+8') {
        image = `registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-${this.getRuntime()}:${fcDockerV}`;
      } else {
        image = `aliyunfc/runtime-${this.getRuntime()}:${fcDockerV}`;
      }
      logger.debug(`use fc docker image: ${image}`);
      return image;
    }
  }

  async getMountString(): Promise<string> {
    // TODO: layer and  tmp dir
    const codeUri = await this.getCodeUri();
    let mntStr = `-v ${codeUri}:/code`;
    return mntStr;
  }

  async getEnvString(): Promise<string> {
    const credentials = await this.getCredentials();
    const sysEnvs = {
      FC_ACCOUNT_ID: credentials.AccountID || '',
      FC_ACCESS_KEY_ID: credentials.AccessKeyID || '',
      FC_ACCESS_KEY_SECRET: credentials.AccessKeySecret || '',
      FC_SECURITY_TOKEN: credentials.SecurityToken || '',
      FC_HANDLER: this.getHandler(),
      FC_TIMEOUT: this.getTimeout(),
      FC_MEMORY_SIZE: this.getMemorySize(),
      FC_FUNCTION_NAME: this.getFunctionName(),
      FC_REGION: this.getRegion(),
      FC_SERVER_PORT: this.getCaPort(),
    };
    if (!_.isEmpty(this.getInitializer())) {
      sysEnvs['FC_INITIALIZER'] = this.getInitializer();
      sysEnvs['FC_INITIALIZATION_TIMEOUT'] = this.getInitializerTimeout();
    }

    let envStr = '';
    for (const item in sysEnvs) {
      // console.log(`${item}: ${sysEnvs[item]}`);
      envStr += ` -e "${item}=${sysEnvs[item]}"`;
    }

    // function envs
    if ('environmentVariables' in this.getFunctionProps()) {
      const envs = this.getFunctionProps().environmentVariables;
      for (const item in envs) {
        //console.log(`${item}: ${envs[item]}`);
        envStr += ` -e "${item}=${envs[item]}"`;
      }
    }

    // breakpoint debugging
    logger.debug(`debug args ===> ${this.getDebugArgs()}`);
    if (!_.isEmpty(this.getDebugArgs())) {
      envStr += ` -e "${this.getDebugArgs()}"`;
      if (!this.getRuntime().startsWith('php')) {
        envStr += ` -p ${this.getDebugPort()}:${this.getDebugPort()}`;
      }
    }

    return envStr;
  }

  async writeVscodeDebugConfig(): Promise<void> {
    const baseDir = process.cwd();
    const dotVsCodeDir = path.join(baseDir, '.vscode');
    if (!fs.existsSync(dotVsCodeDir)) {
      fs.mkdirSync(dotVsCodeDir);
    }
    const filename = path.join(dotVsCodeDir, 'launch.json');
    const vscodeDebugConfig = await this.generateVscodeDebugConfig();
    logger.log(
      'You can paste these config to .vscode/launch.json, and then attach to your running function',
      'yellow',
    );
    logger.log('///////////////// config begin /////////////////');
    logger.log(vscodeDebugConfig);
    logger.log('///////////////// config end /////////////////');
    try {
      fs.writeFileSync(filename, vscodeDebugConfig, 'utf-8');
    } catch (err) {
      logger.error(`Failed to write file ${filename}: ${err.message}`);
    }
  }

  async generateVscodeDebugConfig(): Promise<string> {
    return Promise.resolve('');
  }

  getDebugArgs(): string {
    return '';
  }

  getDebugPort(): number {
    return this.getArgsData()['debug-port'] as number;
  }

  getDebugIDE(): string {
    return this.getArgsData()['config'] as string;
  }

  debugIDEIsVsCode(): boolean {
    return this.getDebugIDE() == IDE_VSCODE;
  }

  before(): boolean {
    logger.debug('before ...');
    const codeUriValid = this.checkCodeUri();
    logger.debug(`checkCodeUri = ${codeUriValid}`);
    if (!codeUriValid && !this.isCustomContainerRuntime()) {
      logger.error('codeUri is invalid when runtime is not custom-container');
      return false;
    }
    if (
      (!_.isString(this.getDebugIDE()) && _.isFinite(this.getDebugPort())) ||
      (_.isString(this.getDebugIDE()) && !_.isFinite(this.getDebugPort()))
    ) {
      logger.error('Args config and debug-port must exist simultaneously');
      return false;
    }
    return true;
  }

  after() {
    logger.debug('after ...');
    if (this.unzippedCodeDir) {
      rimraf.sync(this.unzippedCodeDir);
      console.log(`clean tmp code dir ${this.unzippedCodeDir} successfully`);
      this.unzippedCodeDir = undefined;
    }
  }
}