import { BaseLocal } from '../baseLocal';
import { formatJsonString } from '../utils';
import logger from '../../../../logger';
import _ from 'lodash';
import { runCommand } from '../../../../utils';
import fs from 'fs';
import * as portFinder from 'portfinder';
import { v4 as uuidV4 } from 'uuid';
import chalk from 'chalk';
import { execSync } from 'child_process';

const httpx = require('httpx');

export class BaseLocalInvoke extends BaseLocal {
  port: number;

  beforeInvoke(): boolean {
    logger.debug('beforeInvoke ...');
    return super.before();
  }

  afterInvoke() {
    logger.debug('afterInvoke ...');
    return super.after();
  }

  async invoke() {
    const check = this.beforeInvoke();
    if (!check) {
      return;
    }
    await this.runInvoke();
    this.afterInvoke();
  }

  async runInvoke() {
    const cmdStr = await this.getLocalInvokeCmdStr();
    await runCommand(cmdStr, runCommand.showStdout.ignore);
    await this.checkServerReady(this.port, 1000, 20);

    if (this.isDebug()) {
      runCommand(`docker logs -f ${this.getContainerName()}`, runCommand.showStdout.pipe);
    }
    const credentials = await this.getCredentials();
    const requestId = uuidV4();
    const headers = {
      'Content-Type': 'application/octet-stream',
      'x-fc-request-id': requestId,
      'x-fc-function-name': this.getFunctionName(),
      'x-fc-function-memory': this.getMemorySize(),
      'x-fc-function-timeout': this.getTimeout(),
      'x-fc-function-handler': this.getHandler(),
      'x-fc-region': this.getRegion(),
      'x-fc-account-id': credentials.AccountID,
      'x-fc-access-key-id': credentials.AccessKeyID,
      'x-fc-access-key-secret': credentials.AccessKeySecret,
      'x-fc-security-token': credentials.SecurityToken || '',
      'x-fc-initialization-timeout': this.getInitializerTimeout()
        ? this.getInitializerTimeout()
        : '',
      'x-fc-function-initializer': this.getInitializer() ? this.getInitializer() : '',
      'X-Fc-Log-Type': 'Tail',
      'X-Fc-Event-Type': 'Default',
      'X-Fc-Request-Id': requestId,
      'X-Fc-HTTP-Path': '/',
    };
    const postData = Buffer.from(this.getEventString(), 'binary');
    // 断点调试允许超时时间延长一小时
    const timeout = _.isEmpty(this.getDebugArgs())
      ? (this.getTimeout() + 3) * 1000
      : (this.getTimeout() + 60 * 60) * 1000;

    const { result, headerInfo } = await this.request(
      `http://localhost:${this.port}/2023-03-30/functions/function/invocations`,
      'POST',
      headers,
      postData,
      timeout,
    );

    if (!this.isDebug()) {
      console.log(Buffer.from(headerInfo['x-fc-log-result'], 'base64').toString());
    }
    console.log(result.toString());

    const abstract = `RequestId: ${headerInfo['x-fc-request-id']}   Billed Duration: ${
      headerInfo['x-fc-invocation-duration']
    } ms    Memory Size: ${this.getMemorySize()} MB    Max Memory Used: ${
      headerInfo['x-fc-max-memory-usage']
    } MB`;
    console.log(`${chalk.green(abstract)}\n`);
    // kill container
    try {
      execSync(`docker kill ${this.getContainerName()}`);
    } catch (e) {
      logger.error(`fail to docker kill ${this.getContainerName()}, error=${e}`);
    }
    process.exit();
  }

  getEventString(): string {
    const eventStr = _.get(this._argsData, 'event');
    if (!_.isEmpty(_.trim(eventStr))) {
      return formatJsonString(eventStr);
    }

    const eventFile = _.get(this._argsData, 'event-file');
    if (eventFile && fs.existsSync(eventFile) && fs.statSync(eventFile).isFile()) {
      const str = fs.readFileSync(eventFile, 'utf-8');
      return formatJsonString(str);
    }
    return '';
  }

  async getLocalInvokeCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    // const msg = `You can use curl or Postman to make an HTTP request to localhost:${port} to test the function.for example:`;
    // console.log('\x1b[33m%s\x1b[0m', msg);
    this.port = port;

    const mntStr = await this.getMountString();
    const image = await this.getRuntimeRunImage();
    const envStr = await this.getEnvString();
    const dockerCmdStr = `docker run --name ${this.getContainerName()} -d --platform linux/amd64 --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image}`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    logger.debug(`You can start the container using the following command: `);
    logger.debug(`${chalk.blue(dockerCmdStr)}\n`);
    return dockerCmdStr;
  }

  async request(url: string, method: any, headers: any, writeData: any, timeout: number) {
    const response = await httpx.request(url, {
      timeout,
      method,
      headers,
      data: writeData,
    });
    const responseBody = await httpx.read(response, 'utf8');
    return { result: responseBody, headerInfo: response.headers };
  }
}
