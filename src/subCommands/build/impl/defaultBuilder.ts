import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';

import { Builder } from './baseBuilder';
import { runCommand } from '../../../utils';
import logger from '../../../logger';
import { buildPythonLocalPath } from '../../../default/image';
import { parseArgv } from '@serverless-devs/utils';
import { IInputs } from '../../../interface';

export class DefaultBuilder extends Builder {
  private opts: any;
  constructor(readonly inputs: IInputs) {
    super(inputs);
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help', 'use-sandbox'],
      string: ['custom-env', 'custom-args', 'command', 'script-file'],
    });
    this.opts = opts;
    logger.debug(`DefaultBuilder opts: ${JSON.stringify(opts)}`);
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

  public async runBuild() {
    logger.debug(`DefaultBuilder building ... ${JSON.stringify(this.inputs)}`);
    if (this.opts['use-sandbox']) {
      const dockerCmdStr = `docker run --platform linux/amd64 -it ${this.getCustomEnvStr()} -v ${this.getCodeUri()}:/code ${await this.getRuntimeBuildImage()} bash`;
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
      shellScript = `"${tasks.join('\n')}"`;
    }

    if (this.isAppCenter()) {
      let cmdStr = `bash -c`;
      if (this.opts['script-file']) {
        cmdStr = `bash ${this.opts['script-file']}`;
      }
      await runCommand(cmdStr, runCommand.showStdout.append, shellScript, this.getCodeUri());
    } else {
      let dockerCmdStr = `docker run --platform linux/amd64 --rm ${this.getCustomEnvStr()} -v ${this.getCodeUri()}:/code ${await this.getRuntimeBuildImage()} bash -c`;
      if (this.opts['script-file']) {
        dockerCmdStr = `docker run --platform linux/amd64 --rm ${this.getCustomEnvStr()} -v ${this.getCodeUri()}:/code ${await this.getRuntimeBuildImage()} bash ${
          this.opts['script-file']
        }`;
      }
      logger.debug(`shellScript = ${shellScript}`);
      await runCommand(dockerCmdStr, runCommand.showStdout.append, shellScript, this.getCodeUri());
    }
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
}
