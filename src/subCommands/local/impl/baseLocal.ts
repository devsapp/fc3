import path from 'path';
import _ from 'lodash';
import { v4 as uuidV4 } from 'uuid';
import extract from 'extract-zip';
import tmpDir from 'temp-dir';
import * as fs from 'fs-extra';
import * as rimraf from 'rimraf';
import { parseArgv } from '@serverless-devs/utils';
import { ICredentials } from '@serverless-devs/component-interface';
import { vpcImage2InternetImage } from './utils';
import logger from '../../../logger';
import { ICodeUri } from '../../../interface';
import { IDE_VSCODE } from '../../../constant';
import { IInputs } from '../../../interface';
import {
  fcDockerNameSpace,
  fcDockerUseImage,
  fcDockerVersion,
  fcDockerVersionRegistry,
} from '../../../default/image';
import { runCommand } from '../../../utils';
import FC from '../../../resources/fc';
const { execSync } = require('child_process');

export class BaseLocal {
  protected defaultDebugArgs: string;
  protected _argsData: object;
  protected unzippedCodeDir?: string;
  private baseDir: string;

  constructor(readonly inputs: IInputs) {
    this.baseDir = inputs.baseDir || process.cwd();
    logger.info(`Local baseDir is: ${this.baseDir}`);
    const argsData: { [key: string]: any } = parseArgv(this.inputs.args, {
      string: ['event', 'event-file', 'config', 'debug-port'],
      alias: { event: 'e', 'event-file': 'f', config: 'c', 'debug-port': 'd' },
    });
    logger.debug(`argsData ====> ${JSON.stringify(argsData)}`);
    this._argsData = argsData;
  }

  getFunctionTriggers(): any {
    return this.inputs.props.triggers;
  }

  getRuntime(): string {
    return this.inputs.props.runtime;
  }

  getFunctionName(): string {
    return this.inputs.props.functionName;
  }

  getCaPort(): number {
    const runtime = this.getRuntime();

    if (FC.isCustomContainerRuntime(runtime)) {
      return (this.inputs.props.customContainerConfig?.port as number) || 9000;
    } else if (FC.isCustomRuntime(runtime)) {
      return (this.inputs.props.customRuntimeConfig?.port as number) || 9000;
    }

    return 9000;
  }

  getHandler(): string {
    let handler = this.inputs.props.handler;
    if (this.getRuntime().startsWith('custom') && handler == undefined) {
      handler = 'index.handler';
    }
    return handler;
  }

  getTimeout(): number {
    return this.inputs.props.timeout as number;
  }

  getInitializer(): string {
    return this.inputs.props.instanceLifecycleConfig?.initializer?.handler;
  }

  getInitializerTimeout(): number {
    return this.inputs.props.instanceLifecycleConfig?.initializer?.timeout as number;
  }

  getMemorySize(): number {
    return (this.inputs.props.memorySize as number) || 128;
  }

  getRegion(): string {
    return this.inputs.props.region;
  }

  async getCredentials(): Promise<ICredentials> {
    return await this.inputs.getCredential();
  }

  getAcrEEInstanceID(): string {
    return _.get(this.inputs.props, 'customContainerConfig.acrInstanceID');
  }

  isHttpFunction(): boolean {
    return this.getFunctionTriggers()?.[0].type === 'http';
  }

  isCustomContainerRuntime(): boolean {
    return this.inputs.props.runtime === 'custom-container';
  }

  async getCodeUri(): Promise<string> {
    if (this.unzippedCodeDir) {
      return this.unzippedCodeDir;
    }
    let props = this.inputs.props;
    const codeUri = props.code as ICodeUri;
    let src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    const runtime = props.runtime;
    if (_.endsWith(src, '.zip') || (_.endsWith(src, '.jar') && runtime.startsWith('java'))) {
      const tmpCodeDir: string = path.join(tmpDir, uuidV4());
      await fs.ensureDir(tmpCodeDir);
      logger.log(`code is a zip or jar format, will unzipping to ${tmpCodeDir}`);
      await extract(src, { dir: tmpCodeDir });
      this.unzippedCodeDir = tmpCodeDir;
      return tmpCodeDir;
    } else if (_.endsWith(src, '.jar') && FC.isCustomRuntime(runtime)) {
      const command = _.get(props, 'customRuntimeConfig.command', []);
      const args = _.get(props, 'customRuntimeConfig.args', []);
      const commandStr = `${_.join(command, ' ')} ${_.join(args, ' ')}`;
      if (commandStr.includes('java -jar')) {
        const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(this.baseDir, src);
        return path.dirname(resolvedCodeUri);
      } else {
        const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(this.baseDir, src);
        const tmpCodeDir = await this.tryUnzip(resolvedCodeUri);
        this.unzippedCodeDir = tmpCodeDir;
        return tmpCodeDir;
      }
    } else if (_.endsWith(src, '.war')) {
      const tmpCodeDir = await this.tryUnzip(src);
      this.unzippedCodeDir = tmpCodeDir;
      return tmpCodeDir;
    } else {
      const resolvedCodeUri = path.isAbsolute(src) ? src : path.join(this.baseDir, src);
      return resolvedCodeUri;
    }
  }

  // jar and war try use unzip command, reminder user install unzip
  private async tryUnzip(src: string): Promise<string> {
    const tmpCodeDir: string = path.join(tmpDir, uuidV4());
    await fs.ensureDir(tmpCodeDir);
    logger.log(`code is a jar or war format, will unzipping to ${tmpCodeDir}`);
    try {
      const result = execSync(`unzip -q ${src} -d ${tmpCodeDir}`, { encoding: 'utf-8' });
      logger.info(result);
    } catch (err) {
      // https://linux.die.net/man/1/unzip
      // 1:  one or more warning errors were encountered, but processing completed successfully anyway
      if (err.status !== 1) {
        logger.error(err);
        logger.error('install unzip in your machine and retry');
      }
    }
    return tmpCodeDir;
  }

  checkCodeUri(): boolean {
    const codeUri = this.inputs.props.code;
    if (!codeUri) {
      return false;
    }
    const src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    if (!src) {
      logger.info('No Src configured');
      return false;
    }
    return true;
  }

  async getRuntimeRunImage(): Promise<string> {
    let image: string;

    if (this.isCustomContainerRuntime()) {
      image = vpcImage2InternetImage(this.inputs.props.customContainerConfig.image);
      logger.debug(`use fc docker CustomContainer image: ${image}`);
    } else if (fcDockerUseImage) {
      image = fcDockerUseImage;
      logger.debug(`use fc docker custom image: ${image}`);
    } else {
      let runtime = this.getRuntime();
      if (runtime === 'python3') {
        runtime = 'python3.6';
      }
      image = `${fcDockerVersionRegistry}/${fcDockerNameSpace}/runtime-${runtime}:${fcDockerVersion}`;
      logger.debug(`use fc docker image: ${image}`);
      await runCommand(`docker pull ${image}`, runCommand.showStdout.inherit);
    }

    return image;
  }

  async getMountString(): Promise<string> {
    // TODO: layer and  tmp dir
    const codeUri = await this.getCodeUri();
    logger.debug(`mount codeUri = ${codeUri}`);
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
    if ('environmentVariables' in this.inputs.props) {
      const envs = this.inputs.props.environmentVariables;
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
    const dotVsCodeDir = path.join(this.baseDir, '.vscode');
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

  isFastRuntime = (): boolean => ['python3.10', 'go1'].includes(this.getRuntime());

  getDebugArgs(): string {
    return '';
  }

  getDebugPort(): number {
    return parseInt(this._argsData['debug-port']);
  }

  getDebugIDE(): string {
    return this._argsData['config'] as string;
  }

  debugIDEIsVsCode(): boolean {
    return this.getDebugIDE() == IDE_VSCODE;
  }

  before(): boolean {
    logger.debug('before ...');
    const codeUriValid = this.checkCodeUri();
    logger.debug(`checkCodeUri = ${codeUriValid}`);
    if (!codeUriValid && !this.isCustomContainerRuntime()) {
      logger.error('code is invalid when runtime is not custom-container');
      return false;
    }
    if (
      (!_.isString(this.getDebugIDE()) && _.isFinite(this.getDebugPort())) ||
      (_.isString(this.getDebugIDE()) && !_.isFinite(this.getDebugPort()))
    ) {
      logger.error('Args config and debug-port must exist simultaneously');
      return false;
    }
    if (this.isFastRuntime() && _.isFinite(this.getDebugPort())) {
      logger.error(`breakpoint debugging is not support in ${this.getRuntime()} runtime`);
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
