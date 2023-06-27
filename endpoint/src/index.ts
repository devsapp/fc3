import { InputProps } from './common/entity';
import * as path from 'path';
import os from 'os';
import logger from './common/logger';
import * as hostile from 'hostile';
import util from 'util';
import { help, commandParse, reportComponent, getRootHome } from '@serverless-devs/core';
import fs from 'fs';
import yaml from 'js-yaml';

const getFromHosts = util.promisify(hostile.get);
const removeFromHosts = util.promisify(hostile.remove);
const setInHosts = util.promisify(hostile.set);

// 兼容性
async function getDefaultFile() {
  let defaultConfigFileObject = path.join(os.homedir(), '.s', '.fc.default.yaml');
  if (!fs.existsSync(defaultConfigFileObject)) {
    defaultConfigFileObject = `${getRootHome()}/.fc.default.yaml`;
  }
  return defaultConfigFileObject;
}

const DEFAULT_FC_DEV_ENDPOINT = 'fc.dev-cluster.aliyuncs.com';

export default class Component {
  /**
   * 设置阿里云函数计算的默认值
   * @param inputs
   * @returns
   */
  async set(inputs: InputProps) {
    reportComponent('fc-default', {
      command: 'set',
      uid: '',
    });
    const apts = {
      boolean: ['help'],
      alias: { help: 'h' },
    };
    const comParse = commandParse({ args: inputs.args }, apts);
    // @ts-ignore
    if (comParse.data && comParse.data.help) {
      help([{
        header: 'Usage',
        content: 's cli fc-default set [type] [value]',
      }, {
        header: 'Commands',
        content: [
          {
            desc: 'fc-endpoint',
            example: 'Deploy rsource to fc with the custom endpoint;\n Example: [s cli fc-default set fc-endpoint xxx]',
          },
          {
            desc: 'enable-fc-endpoint',
            example: 'Enable the defined fc-endpoint by user;\n Example: [s cli fc-default set enable-fc-endpoint true]',
          },
          {
            desc: 'fc-cluster-ip',
            example: 'Deploy resource to fc with the specific cluster ip;\n Example: [s cli fc-default set fc-cluster-ip xxx]',
          },
          {
            desc: 'api-default-region',
            example: 'Default region when executing [s cli fc api];\n Example: [s cli fc-default set region cn-hangzhou]',
          },
          {
            desc: 'api-default-version',
            example: 'Default API version when executing [s cli fc api], values: 20210416, 20160815;\n Example: [s cli fc-default set version 20210416]',
          },
        ],
      }]);
      return;
    }
    // @ts-ignore
    if (comParse.data && comParse.data._.length > 0) {
      // @ts-ignore
      if (comParse.data._[0] == 'api-default-version') {
        // @ts-ignore
        if (['20210416', '20160815', 20210416, 20160815].includes(comParse.data._[1])) {
          // @ts-ignore
          await this.writeToFile('api-default-version', comParse.data._[1]);
        } else {
          throw new Error('The value range is [\'20210416\', \'20160815\']');
        }
      }
      // @ts-ignore
      if (comParse.data._[0] === 'api-default-region') {
        // @ts-ignore
        await this.writeToFile('api-default-region', comParse.data._[1]);
      }
      // @ts-ignore
      if (comParse.data._[0] === 'fc-endpoint') {
        // @ts-ignore
        await this.writeToFile('fc-endpoint', comParse.data._[1]);
      }
      // @ts-ignore
      if (comParse.data._[0] === 'enable-fc-endpoint') {
        // @ts-ignore
        await this.writeToFile('enable-fc-endpoint', comParse.data._[1]);
      }
      // @ts-ignore
      if (comParse.data._[0] === 'fc-cluster-ip') {
        // @ts-ignore
        const ip: string = comParse.data._[1];
        // 尝试写 /etc/host
        try {
          await this.updateHostsFile(ip, DEFAULT_FC_DEV_ENDPOINT);
        } catch (e) {
          logger.warning(`Update /etc/hosts failed, please use sudo to execute the command or append '${ip}  ${DEFAULT_FC_DEV_ENDPOINT}' to /etc/hosts manually.`);
        }
        logger.debug(`fc cluster ip is ${ip}`);
        await this.writeToFile('fc-endpoint', `http://${DEFAULT_FC_DEV_ENDPOINT}`);
        await this.writeToFile('enable-fc-endpoint', true);
        await this.writeToFile('fc-cluster-ip', ip);
      }
    }
    return await this.getConfigFromFile();
  }

  /**
   * 获取所配置的阿里云函数计算默认值
   * @param inputs
   * @returns
   */
  async get(inputs: InputProps) {
    reportComponent('fc-default', {
      command: 'get',
      uid: '',
    });
    const apts = {
      boolean: ['help'],
      alias: { help: 'h' },
    };
    const args = inputs && inputs.args ? inputs.args : '';
    const comParse = commandParse({ args: args || '' }, apts);
    // @ts-ignore
    if (comParse?.data?.help) {
      help([{
        header: 'Usage',
        content: 's cli fc-default get [type]',
      },
      {
        header: 'Examples',
        content: [
          {
            desc: 'fc-endpoint',
            example: 'Deploy rsource to fc with the custom endpoint',
          },
          {
            desc: 'enable-fc-endpoint',
            example: 'Enable the defined fc-endpoint by user',
          },
          {
            desc: 'fc-cluster-ip',
            example: 'Deploy resource to fc with the specific cluster ip',
          },
          {
            desc: 'api-default-region',
            example: 'Default region when executing [s cli fc api]',
          },
          {
            desc: 'api-default-version',
            example: 'Default API version when executing [s cli fc api]',
          },
        ],
      }]);
      return;
    }
    // @ts-ignore
    if (comParse.data && comParse.data._.length > 0) {
      // 老版本兼容处理
      // @ts-ignore
      if (comParse.data._[0] == 'deploy-type') {
        return (await this.getConfigFromFile())['deploy-type'] || 'sdk';
      }
      // 老版本兼容处理
      // @ts-ignore
      if (comParse.data._[0] == 'web-framework') {
        return (await this.getConfigFromFile())['web-framework'] || 'nas';
      }
      // @ts-ignore
      if (comParse.data._[0] === 'fc-endpoint') {
        return (await this.getConfigFromFile())['fc-endpoint'];
      }
      // @ts-ignore
      if (comParse.data._[0] === 'enable-fc-endpoint') {
        return (await this.getConfigFromFile())['enable-fc-endpoint'];
      }
      // @ts-ignore
      if (comParse.data._[0] === 'fc-cluster-ip') {
        return (await this.getConfigFromFile())['fc-cluster-ip'];
      }
      // @ts-ignore
      if (comParse.data._[0] === 'api-default-region') {
        const defaultRegion = (await this.getConfigFromFile())['api-default-region'] || 'cn-hangzhou';
        await this.writeToFile('api-default-region', defaultRegion);
        return defaultRegion;
      }
      // @ts-ignore
      if (comParse.data._[0] === 'api-default-version') {
        const defaultAPIVersion = (await this.getConfigFromFile())['api-default-version'] || '20210416';
        await this.writeToFile('api-default-version', defaultAPIVersion);
        return defaultAPIVersion;
      }
    }

    return await this.getConfigFromFile();
  }

  private async getConfigFromFile() {
    const defaultConfigFileObject = await getDefaultFile();
    let yamlData;
    try {
      yamlData = await yaml.load(fs.readFileSync(defaultConfigFileObject, 'utf8'));
    } catch (e) {
      yamlData = {
        'api-default-region': 'cn-hangzhou',
        'api-default-version': '20160815',
      };
    }
    yamlData['fc-endpoint'] = process.env['s-default-fc-endpoint'] || process.env.s_default_fc_endpoint || yamlData['fc-endpoint'];
    yamlData['enable-fc-endpoint'] = process.env['s-default-enable-fc-endpoint'] || process.env.s_default_enable_fc_endpoint || yamlData['enable-fc-endpoint'];
    yamlData['fc-cluster-ip'] = process.env['s-default-fc-cluster-ip'] || process.env.s_default_fc_cluster_ip || yamlData['fc-cluster-ip'];
    yamlData['api-default-region'] = process.env['s-default-api-default-region'] || process.env.s_default_api_default_region || yamlData['api-default-region'];
    yamlData['api-default-version'] = process.env['s-default-api-default-version'] || process.env.s_default_api_default_version || yamlData['api-default-version'];

    return yamlData;
  }

  private async writeToFile(key: string, value: any) {
    const defaultConfigFileObject = await getDefaultFile();
    const config = await this.getConfigFromFile();
    config[key] = value;
    await fs.writeFileSync(defaultConfigFileObject, yaml.dump(config));
    return true;
  }

  private async updateHostsFile(ip: string, endpoint: string): Promise<any> {
    const lines = await getFromHosts(false);
    for (const line of lines) {
      const ipInHostsFile: string = line[0];
      const hostInHostsFile: string = line[1];
      if (hostInHostsFile === endpoint) {
        await removeFromHosts(ipInHostsFile, hostInHostsFile);
      }
    }
    await setInHosts(ip, endpoint);
  }
}
