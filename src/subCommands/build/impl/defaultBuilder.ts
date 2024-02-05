import _ from 'lodash';
import * as path from 'path';

import { Builder } from './baseBuilder';
import { runCommand, isAppCenter, isYunXiao } from '../../../utils';
import logger from '../../../logger';
import { buildPythonLocalPath } from '../../../default/image';
import { parseArgv } from '@serverless-devs/utils';
import { IInputs, checkRegion } from '../../../interface';
import FC from '../../../resources/fc';
import { ICredentials } from '@serverless-devs/component-interface';
import Layer from '../../layer/index';
import chalk from 'chalk';
import { v4 as uuidV4 } from 'uuid';
import tmpDir from 'temp-dir';
import * as fs from 'fs-extra';

export class DefaultBuilder extends Builder {
  private opts: any;
  private layer: any;
  constructor(readonly inputs: IInputs) {
    super(inputs);
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help', 'use-sandbox', 'publish-layer'],
      string: ['custom-env', 'custom-args', 'command', 'script-file'],
    });
    this.opts = opts;
    logger.debug(`DefaultBuilder opts: ${JSON.stringify(opts)}`);
    if (opts['publish-layer']) {
      if (!(this.isNodejsLanguage() || this.isPythonLanguage() || this.isPhpLanguage())) {
        throw new Error(
          `The 'publish-layer' parameter is only supported for the Node.js, Python, and PHP languages.`,
        );
      }
      if (opts['use-sandbox']) {
        logger.warn(
          `The 'publish-layer' parameter is invalid when the 'use-sandbox' parameter is present.`,
        );
      }
    }
  }

  getCustomEnvStr(): string {
    let envStr = '';
    const envs = _.get(this.opts, 'custom-env', '{}');
    try {
      const envsObj = JSON.parse(envs);
      for (const item in envsObj) {
        envStr += ` -e "${item}=${envsObj[item]}"`;
      }
      logger.debug(`getCustomEnvStr = ${envStr}`);
    } catch (ex) {
      logger.error(`custom-env ${envs} is not a json string`);
      throw ex;
    }
    return envStr;
  }

  getBuildDir() {
    let buildDir = this.getCodeUri();
    return buildDir;
  }

  public async runBuild() {
    logger.debug(`DefaultBuilder building ... ${JSON.stringify(this.inputs)}`);
    const buildDir = this.getBuildDir();
    if (this.opts['use-sandbox']) {
      const dockerCmdStr = `docker run --platform linux/amd64 -it ${this.getCustomEnvStr()} -v ${buildDir}:/code ${await this.getRuntimeBuildImage()} bash`;
      return await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
    }
    let shellScript = '';
    if (this.opts['command']) {
      shellScript = `"${this.opts['command']}"`;
    } else if (this.opts['script-file']) {
      shellScript = undefined;
    } else {
      let tasks = this.getBuildTasks();
      logger.debug(`DefaultBuilder tasks=${JSON.stringify(tasks)}`);
      if (_.isEmpty(tasks)) {
        logger.info('No need build for this project.');
        return;
      }
      shellScript = `"${tasks.join(' && ')}"`;
    }

    if (isAppCenter() || isYunXiao()) {
      let cmdStr = `bash -c`;
      if (this.opts['script-file']) {
        cmdStr = `bash ${this.opts['script-file']}`;
      }
      await runCommand(cmdStr, runCommand.showStdout.pipe, shellScript, buildDir);
    } else {
      let dockerCmdStr = `docker run --platform linux/amd64 --rm ${this.getCustomEnvStr()} -v ${buildDir}:/code ${await this.getRuntimeBuildImage()} bash -c`;
      if (this.opts['script-file']) {
        dockerCmdStr = `docker run --platform linux/amd64 --rm ${this.getCustomEnvStr()} -v ${buildDir}:/code ${await this.getRuntimeBuildImage()} bash ${
          this.opts['script-file']
        }`;
      }
      logger.debug(`shellScript = ${shellScript}`);
      await runCommand(dockerCmdStr, runCommand.showStdout.pipe, shellScript, buildDir);
    }

    if (this.opts['publish-layer']) {
      await this.handle_publish_layer();
    }
  }

  public async handle_publish_layer() {
    logger.debug('publish layer .......');
    const region = this.getRegion();
    logger.debug(`${region}`);
    checkRegion(region);
    const credential = (await this.inputs.getCredential()) as ICredentials;
    const fcSdk = new FC(region, credential, {
      endpoint: this.getProps().endpoint,
      userAgent: `${
        this.inputs.userAgent ||
        `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:build-publish-layer`,
    });
    let buildDir: string = this.getBuildDir();
    buildDir = path.isAbsolute(buildDir) ? buildDir : path.join(this.baseDir, buildDir);
    const tmpCodeDir: string = path.join(tmpDir, uuidV4());
    await fs.ensureDir(tmpCodeDir);

    let buildFcIgnoreContent = '';

    // 处理 python 的第三方依赖
    const pythonDir = path.join(buildDir, 'python');
    if (fs.existsSync(pythonDir) && fs.lstatSync(pythonDir).isDirectory()) {
      // 排除第三方依赖包中的 __pycache__ 目录影响 zip 文件夹 md5 值的变化
      const fcIgnoreContent = `__pycache__
python/*/__pycache__
python/*/*/__pycache__`;
      const fcignorePath = path.join(tmpCodeDir, '.fcignore');
      fs.writeFileSync(fcignorePath, fcIgnoreContent);
      try {
        fs.copySync(pythonDir, path.join(tmpCodeDir, 'python'));
        logger.info(`copy ${pythonDir} to ${path.join(tmpCodeDir, 'python')} success`);
      } catch (err) {
        logger.error(`copy ${pythonDir} failure`, err);
      }
      buildFcIgnoreContent += `
python`;
    }

    // 处理 apt 的第三方依赖
    const aptDir = path.join(buildDir, 'apt-archives');
    if (fs.existsSync(aptDir) && fs.lstatSync(aptDir).isDirectory()) {
      try {
        fs.copySync(aptDir, path.join(tmpCodeDir, 'apt-archives'));
        logger.info(`copy ${aptDir} to ${path.join(tmpCodeDir, 'apt-archives')} success`);
      } catch (err) {
        logger.error(`copy ${aptDir} failure`, err);
      }
      buildFcIgnoreContent += `
apt-archives`;
    }

    // 处理 nodejs node_modules 的第三方依赖
    const nodeModulesDir = path.join(buildDir, 'node_modules');
    if (fs.existsSync(nodeModulesDir) && fs.lstatSync(nodeModulesDir).isDirectory()) {
      try {
        fs.copySync(nodeModulesDir, path.join(tmpCodeDir, '/nodejs/node_modules'));
        logger.info(
          `copy ${nodeModulesDir} to ${path.join(tmpCodeDir, '/nodejs/node_modules')} success`,
        );
      } catch (err) {
        logger.error(`copy ${nodeModulesDir} failure`, err);
      }
      buildFcIgnoreContent += `
node_modules`;
    }

    // 处理 php vendor 的第三方依赖
    const vendorDir = path.join(buildDir, 'vendor');
    if (fs.existsSync(vendorDir) && fs.lstatSync(vendorDir).isDirectory()) {
      try {
        fs.copySync(vendorDir, path.join(tmpCodeDir, '/php/vendor'));
        logger.info(`copy ${vendorDir} to ${path.join(tmpCodeDir, '/php/vendor')} success`);
      } catch (err) {
        logger.error(`copy ${vendorDir} failure`, err);
      }
      buildFcIgnoreContent += `
vendor`;
    }

    // 当前目录自动写入一个 .fcignore 文件
    const fcignorePath = path.join(buildDir, '.fcignore');
    if (fs.existsSync(fcignorePath)) {
      const data = fs.readFileSync(fcignorePath, 'utf8');
      if (!data.includes(buildFcIgnoreContent)) {
        fs.appendFileSync(fcignorePath, buildFcIgnoreContent);
      }
    } else {
      fs.writeFileSync(fcignorePath, buildFcIgnoreContent);
    }

    const toZipDir = tmpCodeDir;

    const layerName = `${this.getFunctionName()}-layer`.replace(/\$/g, '-');
    const compatibleRuntimeList: string[] = [];
    compatibleRuntimeList.push(this.getRuntime());

    this.layer = await Layer.safe_publish_layer(
      fcSdk,
      toZipDir,
      region,
      layerName,
      compatibleRuntimeList,
      this.opts.description || '',
    );
  }

  public getBuildTasks(): string[] {
    let tasks: string[] = [];
    // task work dir is /code  ===  s.yaml code
    if (this.existManifest('apt-get.list')) {
      const module = this.readFileLine('apt-get.list');
      logger.debug(`Read apt-get.list file: ${module}`);
      if (module) {
        tasks.push(`apt-get-install ${module}`);
      }
    }

    let runtime = this.getRuntime();

    const customArgs = _.get(this.opts, 'custom-args', '');

    switch (runtime) {
      case 'python2.7':
      case 'python3':
      case 'python3.9':
      case 'python3.10':
        if (this.existManifest('requirements.txt')) {
          tasks.push(
            `pip install -t ${buildPythonLocalPath} -r requirements.txt --upgrade ${customArgs}`,
          );
        }
        break;
      case 'nodejs6':
      case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16':
      case 'nodejs18':
      case 'nodejs20':
        if (this.existManifest('package.json')) {
          tasks.push(`npm install ${customArgs}`);
        }
        break;
      case 'php7.2':
        if (this.existManifest('composer.json')) {
          tasks.push(`composer install ${customArgs}`);
        }
        break;
      case 'custom':
      case 'custom.debian10':
        if (this.existManifest('requirements.txt')) {
          tasks.push(
            `pip install -t ${buildPythonLocalPath} -r requirements.txt --upgrade ${customArgs}`,
          );
        }
        if (this.existManifest('package.json')) {
          tasks.push(`npm install ${customArgs}`);
        }
        if (this.existManifest('composer.json')) {
          tasks.push(`composer install ${customArgs}`);
        }
        if (this.existManifest('pom.xml')) {
          tasks.push(`mvn package -DskipTests ${customArgs}`);
        }
        break;
      case 'java8':
      case 'java11':
        logger.warn(
          `build is not supported in ${runtime}, Using "mvn package -DskipTests" directly with java runtime, assuming you have installed the OpenJDK locally.`,
        );
      case 'go1':
        logger.warn(
          `build is not supported in ${runtime}, Using "GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o target/main main.go" directly with go runtime, assuming you have installed the Golang SDK locally.`,
        );
      case 'dotnetcore2.1':
      case 'dotnetcore3.1':
        logger.warn(
          `build is not supported in ${runtime}, Using "dotnet publish -c Release -o ./target" directly with go runtime, assuming you have installed the DotnetCore SDK locally.`,
        );
      default:
        logger.warn(
          `build is not supported in ${runtime}, you can use --use-sandbox to enter the sandbox container of ${runtime} runtime.`,
        );
    }
    return tasks;
  }

  readFileLine(fileName: string): string {
    const filePath = path.join(this.getCodeUri(), fileName);
    const str = fs.readFileSync(filePath, 'utf8').split('\n').map(_.trim);
    return str.filter((item) => item && !item.startsWith('# ')).join(' ');
  }

  afterBuild() {
    logger.debug('afterBuild ...');
    let tipEnvs: string[] = [];

    const libPath = this._afterTipLibPath();
    if (libPath) {
      tipEnvs.push(libPath);
    }

    const pythonPath = this._afterTipPython();
    if (pythonPath) {
      tipEnvs.push(pythonPath);
    }

    const nodePath = this._afterTipNodejs();
    if (nodePath) {
      tipEnvs.push(nodePath);
    }

    const p = this._afterTipPath();
    if (p) {
      tipEnvs.push(p);
    }

    const tipsLayer = () => {
      if (this.opts['publish-layer'] && this.layer) {
        if (this.getProps().layers?.includes(this.layer.layerVersionArn)) {
          return false;
        }
        return true;
      }
      return false;
    };
    const tLayer = tipsLayer();
    if (!_.isEmpty(tipEnvs) || tLayer) {
      logger.info(
        'You need to add a new configuration env configuration dependency in yaml to take effect. The configuration is as follows:',
      );
      if (!_.isEmpty(tipEnvs)) {
        const envs = this.getEnv();
        for (let [key, value] of Object.entries(envs)) {
          if (key in tipEnvs) {
            continue;
          }
          tipEnvs.push(`${key}: ${value}`);
        }
        logger.write(
          chalk.yellow(`environmentVariables:
  ${tipEnvs.join('\n  ')}
`),
        );
      }
      if (tLayer) {
        const genLayerArnWithoutVersion = this.layer.layerVersionArn.split('/versions/')[0];
        const layers = [];
        const ls = this.getProps()?.layers || [];
        for (let i = 0; i < ls.length; i++) {
          const layerArnWithoutVersion = ls[i].split('/versions/')[0];
          if (genLayerArnWithoutVersion == layerArnWithoutVersion) {
            continue;
          }
          layers.push(ls[i]);
        }
        layers.push(this.layer.layerVersionArn);
        logger.write(
          chalk.yellow(`layers:
  - ${layers.join('\n  - ')}
`),
        );
      }
    }

    this._afterTipPhp();
  }

  // 针对 python 友好提示
  private _afterTipPython(): string | undefined {
    if (!this.isPythonLanguage()) {
      return;
    }

    let pyPath = `/code/${buildPythonLocalPath}`;
    if (this.opts['publish-layer']) {
      pyPath = `/opt/${buildPythonLocalPath}`;
    }

    const { PYTHONPATH } = this.getEnv();
    logger.debug(`PYTHONPATH ${PYTHONPATH}`);
    if (PYTHONPATH === pyPath) {
      return;
    }
    return `PYTHONPATH: ${pyPath}`;
  }

  // 针对 nodejs 友好提示
  private _afterTipNodejs(): string | undefined {
    if (!this.isNodejsLanguage()) {
      return;
    }
    if (this.opts['publish-layer']) {
      const { NODE_PATH } = this.getEnv();
      const nodePath = '/opt/nodejs/node_modules';
      logger.debug(`NODE_PATH ${NODE_PATH}`);
      if (NODE_PATH === nodePath) {
        return;
      }
      return `NODE_PATH: ${nodePath}`;
    }
  }

  // 针对 php 友好提示
  private _afterTipPhp(): string | undefined {
    if (!this.isPhpLanguage()) {
      return;
    }
    if (this.opts['publish-layer']) {
      logger.write(
        chalk.yellow(
          `You should write the line 'require_once "/opt/php/vendor/autoload.php"' at the beginning of your code.`,
        ),
      );
    }
  }

  private _afterTipPath(): string | undefined {
    let needTipPath = false;
    let defaultPath =
      '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/code:/code/bin:/opt:/opt/bin';
    let PATH = this.getEnv().PATH || defaultPath;
    const isPython = this.isPythonLanguage();
    const codeUri = this.getCodeUri();

    if (isPython) {
      const packagesBin = path.join(codeUri, buildPythonLocalPath, 'bin');
      const hasBin = fs.existsSync(packagesBin) && fs.lstatSync(packagesBin).isDirectory();
      let fcPythonBinPath = `/code/${buildPythonLocalPath}/bin`;
      if (this.opts['publish-layer']) {
        fcPythonBinPath = `/opt/${buildPythonLocalPath}/bin`;
      }
      const pathNotFoundBin = !PATH.includes(fcPythonBinPath);
      logger.debug(`hasBin ${hasBin}; !PATH.includes = ${pathNotFoundBin}`);
      if (hasBin && pathNotFoundBin) {
        PATH = `${fcPythonBinPath}:${PATH}`;
        needTipPath = true;
      }
    }

    let aptBinPath = '/code/apt-archives/usr/bin';
    if (this.opts['publish-layer']) {
      aptBinPath = '/opt/apt-archives/usr/bin';
    }
    if (this.existManifest('apt-get.list') && !PATH.includes(aptBinPath)) {
      PATH = `${aptBinPath}:${PATH}`;
      needTipPath = true;
    }

    return needTipPath ? `PATH: ${PATH}` : undefined;
  }

  private _afterTipLibPath(): string | undefined {
    let { LD_LIBRARY_PATH } = this.getEnv();
    if (this.existManifest('apt-get.list')) {
      if (!LD_LIBRARY_PATH) {
        let libPaths = [
          '/code/apt-archives/usr/local/lib',
          '/code/apt-archives/usr/lib',
          '/code/apt-archives/usr/lib/x86_64-linux-gnu',
          '/code/apt-archives/usr/lib64',
          '/code/apt-archives/lib',
          '/code/apt-archives/lib/x86_64-linux-gnu',
          '/code',
        ];
        if (this.opts['publish-layer']) {
          libPaths = [
            '/opt/apt-archives/usr/local/lib',
            '/opt/apt-archives/usr/lib',
            '/opt/apt-archives/usr/lib/x86_64-linux-gnu',
            '/opt/apt-archives/usr/lib64',
            '/opt/apt-archives/lib',
            '/opt/apt-archives/lib/x86_64-linux-gnu',
            '/opt',
          ];
        }
        const libPathsStr = `${libPaths.join(':')}`;
        if (LD_LIBRARY_PATH === undefined) {
          LD_LIBRARY_PATH = '';
        }
        if (!LD_LIBRARY_PATH.includes(libPathsStr)) {
          return `LD_LIBRARY_PATH: ${libPathsStr}`;
        }
      }
    }
    return '';
  }
}
