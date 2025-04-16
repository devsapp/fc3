/* eslint-disable no-await-in-loop */
/* eslint-disable guard-for-in */
import path from 'path';
import _ from 'lodash';
import { v4 as uuidV4 } from 'uuid';
import extract from 'extract-zip';
import tmpDir from 'temp-dir';
import * as fs from 'fs-extra';
import * as rimraf from 'rimraf';
import { parseArgv, getRootHome } from '@serverless-devs/utils';
import { ICredentials } from '@serverless-devs/component-interface';
import logger from '../../../logger';
import { ICodeUri, IInputs, IRegion, checkRegion } from '../../../interface';
import { IDE_VSCODE } from '../../../constant';
import {
  fcDockerNameSpace,
  fcDockerUseImage,
  fcDockerVersion,
  fcDockerVersionRegistry,
} from '../../../default/image';
import { runCommand, sleep } from '../../../utils';
import { execSync } from 'child_process';
import chalk from 'chalk';
import * as httpx from 'httpx';
import FC from '../../../resources/fc';
import downloads from '@serverless-devs/downloads';
import decompress from 'decompress';

export class BaseLocal {
  protected defaultDebugArgs: string;
  protected _argsData: any;
  protected unzippedCodeDir?: string;
  protected fcSdk: FC;
  private _dockerName: string;
  private baseDir: string;

  constructor(readonly inputs: IInputs) {
    this.baseDir = inputs.baseDir || process.cwd();
    logger.info(`Local baseDir is: ${this.baseDir}`);
    const argsData: { [key: string]: any } = parseArgv(this.inputs.args, {
      string: ['event', 'event-file', 'config', 'debug-port'],
      alias: { event: 'e', 'event-file': 'f', config: 'c', 'debug-port': 'd' },
    });
    this._argsData = argsData;
    this._dockerName = uuidV4();
    const region: IRegion = _.get(inputs, 'props.region');
    checkRegion(region);
    this.fcSdk = new FC(region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:local`,
    });

    process.on('DEVS:SIGINT', async () => {
      console.log('\nDEVS:SIGINT, stop container');
      // kill container
      try {
        await sleep(0.5);
        const result = execSync(`docker ps | grep ${this.getContainerName()}`);
        if (result) {
          execSync(`docker kill ${this.getContainerName()}`);
        }
      } catch (e) {
        console.warn(chalk.yellow(`fail to docker kill ${this.getContainerName()}, error=${e}`));
      }
      process.exit();
    });
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
    let { handler } = this.inputs.props;
    if (this.getRuntime().startsWith('custom') && handler === undefined) {
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

  getContainerName(): string {
    return this._dockerName;
  }

  async getCredentials(): Promise<ICredentials> {
    if (_.isEmpty(this.inputs.credential)) {
      this.inputs.credential = await this.inputs.getCredential();
    }
    return this.inputs.credential;
  }

  isHttpFunction(): boolean {
    return this.getFunctionTriggers()?.[0].type === 'http';
  }

  isCustomContainerRuntime(): boolean {
    return this.inputs.props.runtime === 'custom-container';
  }

  // 判断是否开启rie的debug，只要使用了--debug或断点调试就开启。此时，不再打印result header中的日志。
  isDebug(): boolean {
    return !_.isEmpty(this.getDebugArgs());
  }

  async getCodeUri(): Promise<string> {
    if (this.unzippedCodeDir) {
      return this.unzippedCodeDir;
    }
    const { props } = this.inputs;
    const codeUri = props.code as ICodeUri;
    const src: string = typeof codeUri === 'string' ? codeUri : codeUri.src;
    const { runtime } = props;
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
  async tryUnzip(src: string): Promise<string> {
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
      image = this.inputs.props.customContainerConfig.image;
      logger.debug(`use fc docker CustomContainer image: ${image}`);
    } else if (fcDockerUseImage) {
      image = fcDockerUseImage;
      logger.debug(`use fc docker custom image: ${image}`);
    } else {
      let runtime = this.getRuntime();
      if (runtime === 'python3') {
        runtime = 'python3.6';
      }
      if (
        runtime === 'python3.12' ||
        runtime === 'custom.debian11' ||
        runtime === 'custom.debian12'
      ) {
        image = `${fcDockerVersionRegistry}/${fcDockerNameSpace}/runtime:${runtime}-${fcDockerVersion}`;
      } else {
        image = `${fcDockerVersionRegistry}/${fcDockerNameSpace}/runtime-${runtime}:${fcDockerVersion}`;
      }
      logger.debug(`use fc docker image: ${image}`);
      await runCommand(`docker pull ${image}`, runCommand.showStdout.inherit);
    }

    return image;
  }

  async getMountString(): Promise<string> {
    // TODO: layer and  tmp dir
    const codeUri = await this.getCodeUri();
    logger.debug(`mount codeUri = ${codeUri}`);
    return `-v ${codeUri}:/code`;
  }

  async getEnvString(): Promise<string> {
    const credentials = await this.getCredentials();

    const sysEnvs: any = {
      FC_RUNTIME: this.getRuntime(),
      FC_TIMEOUT: this.getTimeout(),
      FC_FUNC_CODE_PATH: '/code/',
      ALIBABA_CLOUD_ACCESS_KEY_ID: credentials.AccessKeyID || '',
      ALIBABA_CLOUD_ACCESS_KEY_SECRET: credentials.AccessKeySecret || '',
      ALIBABA_CLOUD_SECURITY_TOKEN: credentials.SecurityToken || '',
      FC_ACCOUNT_ID: credentials.AccountID || '',
      FC_FUNCTION_HANDLER: this.getHandler(),
      FC_FUNCTION_MEMORY_SIZE: this.getMemorySize(),
      FC_FUNCTION_NAME: this.getFunctionName(),
      FC_REGION: this.getRegion(),
      FC_CUSTOM_LISTEN_PORT: this.getCaPort(),
      FC_INSTANCE_ID: uuidV4(),
    };
    if (!_.isEmpty(this.getInitializer())) {
      sysEnvs.FC_INITIALIZER_HANDLER = this.getInitializer();
      sysEnvs.FC_INITIALIZATION_TIMEOUT = this.getInitializerTimeout();
    }

    let envStr = '';
    for (const item in sysEnvs) {
      envStr += ` -e "${item}=${sysEnvs[item]}"`;
    }

    // function envs
    if ('environmentVariables' in this.inputs.props) {
      const envs = this.inputs.props.environmentVariables;
      for (const item in envs) {
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
      envStr += ` -e "FC_MODE=Debug"`;
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
    const codePath = await this.getCodeUri();
    const debugPort = this.getDebugPort();
    const functionName = this.getFunctionName();

    switch (this.getRuntime()) {
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16':
      case 'nodejs18':
      case 'nodejs20': {
        return JSON.stringify(
          {
            version: '0.2.0',
            configurations: [
              {
                name: `fc/${functionName}`,
                type: 'node',
                request: 'attach',
                address: 'localhost',
                port: debugPort,
                localRoot: `${codePath}`,
                remoteRoot: '/code',
                protocol: 'inspector',
                stopOnEntry: false,
              },
            ],
          },
          null,
          4,
        );
      }
      case 'python3':
      case 'python3.9':
      case 'python3.10':
      case 'python3.12': {
        return JSON.stringify(
          {
            version: '0.2.0',
            configurations: [
              {
                name: `fc/${functionName}`,
                type: 'python',
                request: 'attach',
                host: 'localhost',
                port: debugPort,
                pathMappings: [
                  {
                    localRoot: `${codePath}`,
                    remoteRoot: '/code',
                  },
                ],
              },
            ],
          },
          null,
          4,
        );
      }
      case 'java8':
      case 'java11': {
        return JSON.stringify(
          {
            version: '0.2.0',
            configurations: [
              {
                name: `fc/${functionName}`,
                type: 'java',
                request: 'attach',
                hostName: 'localhost',
                port: debugPort,
              },
            ],
          },
          null,
          4,
        );
      }
      case 'php7.2': {
        return JSON.stringify(
          {
            version: '0.2.0',
            configurations: [
              {
                name: `fc/${functionName}`,
                type: 'php',
                request: 'launch',
                port: debugPort,
                stopOnEntry: false,
                pathMappings: {
                  '/code': `${codePath}`,
                },
                ignore: ['/var/fc/runtime/**'],
              },
            ],
          },
          null,
          4,
        );
      }
      default:
        return '';
    }
  }

  isFastRuntime = (): boolean => ['python3.10', 'go1'].includes(this.getRuntime());

  getDebugArgs(): string {
    return '';
  }

  getDebugPort(): number {
    return parseInt(this._argsData['debug-port'], 10);
  }

  getDebugIDE(): string {
    return this._argsData?.config as string;
  }

  debugIDEIsVsCode(): boolean {
    return this.getDebugIDE() === IDE_VSCODE;
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
    // TODO check if runtime support breakpoint debugging
    if (!this.canSupportDebug(this.getRuntime()) && _.isFinite(this.getDebugPort())) {
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

  async checkServerReady(port: number, delay: number, maxRetries: number) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await httpx.request(`http://localhost:${port}`, { timeout: 5000 });
        logger.log(`Server running on port ${port} is ready!`);
        return;
      } catch (error) {
        retries++;
        logger.log(
          `Server running on port ${port} is not yet ready. Retrying in ${delay}ms (${retries}/${maxRetries})`,
        );
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    logger.error(
      `Server running on port ${port} is not ready after ${maxRetries} retries. Exiting...`,
    );
  }

  canSupportDebug(runtime: string): boolean {
    const supportedRuntimeList = [
      'nodejs10',
      'nodejs12',
      'nodejs14',
      'nodejs16',
      'nodejs18',
      'nodejs20',
      'python3',
      'python3.9',
      'python3.10',
      'python3.12',
      'java8',
      'java11',
      'php7.2',
    ];
    return supportedRuntimeList.includes(runtime);
  }

  getNasMountString(): string {
    let result = '';
    const { nasConfig, functionName, region } = this.inputs.props;

    if (nasConfig === 'auto') {
      logger.warn(
        `Your nasConfig is 'auto', so you cannot simulate nasDir when using local command. You can use 's deploy' to get real nasConfig and replace 'auto'.`,
      );
    }
    if (!_.isEmpty(nasConfig) && nasConfig !== 'auto') {
      const localNasDir = path.join(getRootHome(), `nas`, region, functionName);
      for (const mountPoint of nasConfig.mountPoints) {
        const localServerAddr = path.join(localNasDir, mountPoint.serverAddr.split(':')[1]);
        result += ` -v ${localServerAddr}:${mountPoint.mountDir}`;
      }
      logger.info(
        chalk.green(
          `Your local NAS simulation directory is ${localNasDir}. You can maintain the files as you need in this directory.`,
        ),
      );
    }
    return result;
  }

  async getLayerMountString(): Promise<string> {
    const { layers, runtime } = this.inputs.props;
    if (_.isEmpty(layers)) {
      return '';
    }

    let result = '';
    const localLayerBaseDir = path.join(getRootHome(), 'layer');
    const mergedDir = path.join(getRootHome(), 'temp', `${Date.now()}`);

    if (fs.existsSync(mergedDir)) {
      fs.rmdirSync(mergedDir);
    }
    fs.mkdirSync(mergedDir, { recursive: true });
    process.on('exit', () => {
      fs.rmdirSync(mergedDir, { recursive: true });
    });

    for (const arn of layers) {
      const layerInfo = await this.fcSdk.getLayerVersionByArn(arn);
      if (!layerInfo.compatibleRuntime.includes(runtime)) {
        throw new Error(
          `The Layer ${layerInfo.layerName} is not compatible with this runtime. The layer's ARN is ${arn}`,
        );
      }
      const region = arn.split(':')[2];
      const ownerId = arn.split(':')[3];
      const localLayerDir = path.join(
        localLayerBaseDir,
        region,
        ownerId,
        layerInfo.layerName,
        layerInfo.version.toString(),
      );

      if (fs.existsSync(localLayerDir)) {
        logger.info(
          `The layer code ${localLayerDir} already exists locally, skip the download: ${arn}`,
        );
      } else {
        logger.info(`fetching layer ${arn} ···`);
        // 此处因为downloads方法问题，被迫分解下载和解压操作，进行手动解压删除；后面有时间建议修复downloads，一步到位
        // eslint-disable-next-line no-await-in-loop
        await downloads(
          layerInfo.code.location.replace('-internal.aliyuncs.com', '.aliyuncs.com'),
          {
            dest: localLayerDir,
            filename: layerInfo.version.toString(),
            extract: false,
          },
        );
        const zipPath = path.join(localLayerDir, `${layerInfo.version.toString()}.zip`);
        await decompress(zipPath, localLayerDir);
        fs.unlinkSync(zipPath);
      }
      this.copyFolderContents(localLayerDir, mergedDir);
    }
    result += ` -v ${mergedDir}:/opt`;
    return result;
  }

  copyFolderContents(source, target) {
    // 读取源文件夹内容
    const entries = fs.readdirSync(source, { withFileTypes: true });

    // 确保目标文件夹存在
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    entries.forEach((entry) => {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      // 跳过已存在的目标文件或软链接

      if (entry.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        this.copyFolderContents(sourcePath, targetPath);
      } else if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }
}
