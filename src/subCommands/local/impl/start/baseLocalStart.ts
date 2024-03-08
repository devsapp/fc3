import _ from 'lodash';
import * as portFinder from 'portfinder';
import { BaseLocal } from '../baseLocal';
import logger from '../../../../logger';
import { runCommand } from '../../../../utils';
import http from 'http';
import { createProxyServer } from 'http-proxy';
import chalk from 'chalk';

export class BaseLocalStart extends BaseLocal {
  serverPort: number;
  proxyPort: number;

  beforeStart(): boolean {
    logger.debug('beforeStart ...');
    return super.before();
  }

  afterStart() {
    logger.debug('afterStart ...');
    return super.after();
  }

  async start() {
    const check = this.beforeStart();
    if (!check) {
      return;
    }
    await this.runStart();
    this.afterStart();
  }

  async runStart() {
    const cmdStr = await this.getLocalStartCmdStr();
    this.setupHttpProxy();
    await runCommand(cmdStr, runCommand.showStdout.pipe);
  }

  async getLocalStartCmdStr(): Promise<string> {
    const port = await portFinder.getPortPromise({ port: this.getCaPort() });
    this.serverPort = port;
    const mntStr = await this.getMountString();
    const envStr = await this.getEnvString();
    const image = await this.getRuntimeRunImage();
    const dockerCmdStr = `docker run -i --name ${this.getContainerName()} --platform linux/amd64 --rm -p ${port}:${this.getCaPort()} --memory=${this.getMemorySize()}m ${mntStr} ${envStr} ${image} --http --server`;
    if (!_.isEmpty(this.getDebugArgs())) {
      if (this.debugIDEIsVsCode()) {
        await this.writeVscodeDebugConfig();
      }
    }
    return dockerCmdStr;
  }

  async setupHttpProxy() {
    // 创建一个代理服务器对象
    await this.checkServerReady(this.serverPort, 1000, 20);
    const proxy = createProxyServer({});

    this.proxyPort = await portFinder.getPortPromise({ port: this.serverPort + 1 });
    const msg = `You can use curl or Postman to make an HTTP request to localhost:${this.proxyPort} to test the function`;
    console.log(chalk.green(msg));

    // 创建一个可以拦截请求的HTTP服务器
    http
      .createServer((req, res) => {
        // 在这里，你可以根据需要处理请求
        // 添加你的自定义逻辑，比如验证、日志记录等
        const path = req.url;
        req.url = '/2023-03-30/functions/function/invocations';

        // 转发请求到实际的服务
        proxy.web(req, res, {
          target: `http://localhost:${this.serverPort}`,
          headers: {
            'X-Fc-HTTP-Path': path,
            'X-Fc-Event-Type': 'HTTP',
            'X-Fc-Log-Type': 'Tail',
          },
        });
      })
      .listen(this.proxyPort, () => {
        logger.debug(`代理服务器在端口 ${this.proxyPort} 上运行`);
      });
    proxy.on('proxyRes', async (proxyRes) => {
      if (!this.isDebug()){
        console.log(Buffer.from(proxyRes.headers['x-fc-log-result'], 'base64').toString());
      }
    });
  }
}
