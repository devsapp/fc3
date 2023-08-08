import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';

import { Builder } from './baseBuilder';
import { runCommand } from '../../../utils';
import logger from '../../../logger';
import { buildPythonLocalPath } from '../../../default/image';

export class DefaultBuilder extends Builder {
  public async runBuild() {
    logger.debug(`DefaultBuilder building ... ${JSON.stringify(this.inputProps)}`);
    let tasks = this.getBuildTasks();
    logger.debug(`DefaultBuilder tasks=${JSON.stringify(tasks)}`);
    if (_.isEmpty(tasks)) {
      logger.info('No need build for this project.');
      return;
    }
    let shellScript = `"${tasks.join('\n')}"`;
    const dockerCmdStr = `docker run --platform linux/amd64 --rm -v ${this.getCodeUri()}:/code ${await this.getRuntimeBuildImage()} bash -c`;
    await runCommand(dockerCmdStr, runCommand.showStdout.append, shellScript);
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

    switch (runtime) {
      case 'python2.7':
      case 'python3':
      case 'python3.9':
      case 'python3.10':
        if (this.existManifest('requirements.txt')) {
          tasks.push(`pip install -t ${buildPythonLocalPath} -r requirements.txt --upgrade`);
        }
        break;
      case 'nodejs6':
      case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
        if (this.existManifest('package.json')) {
          tasks.push('npm install');
        }
        break;
      case 'php7.2':
        if (this.existManifest('composer.json')) {
          tasks.push('composer install');
        }
        break;
      case 'custom':
      case 'custom.debian10':
        if (this.existManifest('requirements.txt')) {
          tasks.push(`pip install -t ${buildPythonLocalPath} -r requirements.txt --upgrade`);
        }
        if (this.existManifest('package.json')) {
          tasks.push('npm install');
        }
        if (this.existManifest('composer.json')) {
          tasks.push('composer install');
        }
        if (this.existManifest('pom.xml')) {
          tasks.push('mvn package -DskipTests');
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
