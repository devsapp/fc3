import fs from 'fs';
import fs_extra from 'fs-extra';
import _ from 'lodash';
import yaml from 'js-yaml';
import downloads from '@serverless-devs/downloads';
import { IInputs, IRegion } from '../../interface';
import FC, { GetApiType } from '../../resources/fc';
import { parseArgv } from '@serverless-devs/utils';
import path from 'path';
import logger from '../../logger';

export default class Sync {
  private region: IRegion;
  private functionName: string;
  private fcSdk: FC;
  private target: string;
  private qualifier: string;

  constructor(private inputs: IInputs) {
    const {
      'target-dir': target,
      'function-name': functionName,
      qualifier,
      region,
    } = parseArgv(inputs.args, {
      string: ['target-dir', 'function-name', 'qualifier', 'region'],
      alias: { yes: 'y' },
    });

    if (fs.existsSync(target) && !fs.fstatSync(target).isDirectory()) {
      throw new Error(`--target-dir "${target}" exists, but is not a directory`);
    }

    this.target = target;
    logger.debug(`target: ${target}`);
    this.qualifier = qualifier;
    logger.debug(`qualifier: ${qualifier}`);
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    this.functionName = functionName || _.get(inputs, 'props.function.functionName');
    logger.debug(`function name: ${this.functionName}`);
    this.fcSdk = new FC(this.region, inputs.credential);
  }

  async run() {
    const functionInfo = await this.fcSdk.getFunction(
      this.functionName,
      GetApiType.simpleUnsupported,
      this.qualifier,
    );
    return await this.write(functionInfo);
  }

  write = async (functionConfig) => {
    const baseDir = this.target || this.inputs.baseDir;
    const syncFolderName = 'sync-clone';

    const folderPath = path.join(baseDir, syncFolderName);
    logger.debug(`sync base dir: ${baseDir}`);
    await fs_extra.removeSync(folderPath);
    logger.debug(`clear sync target path: ${folderPath}`);
    const codePath = path.join(baseDir, syncFolderName, `${this.region}_${this.functionName}`);
    logger.debug(`sync code path: ${codePath}`);
    const ymlPath = path.join(baseDir, syncFolderName, `${this.region}_${this.functionName}.yaml`);
    logger.debug(`sync yaml path: ${ymlPath}`);
    if (!FC.isCustomContainerRuntime(functionConfig.runtime)) {
      const { url } = await this.fcSdk.getFunctionCode(this.functionName, this.qualifier);

      await downloads(url, {
        dest: codePath,
        extract: true,
      });

      functionConfig.code = codePath;
    }

    const config = {
      edition: '3.0.0',
      name: this.inputs.name,
      access: this.inputs.resource.access,
      resources: {
        [this.inputs.resource.name]: {
          component: 'fc',
          props: {
            region: this.region,
            function: functionConfig,
          },
        },
      },
    };
    logger.debug(`yaml config: ${JSON.stringify(config)}`);

    const configStr = yaml.dump(config);
    logger.debug(`yaml config str: ${configStr}`);

    fs.mkdirSync(baseDir, { recursive: true });
    logger.debug(`mkdir: ${baseDir}`);
    fs.writeFileSync(ymlPath, configStr);
    logger.debug(`write file: ${baseDir}`);

    return { ymlPath, codePath };
  };
}
