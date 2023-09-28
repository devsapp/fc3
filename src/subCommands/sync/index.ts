import fs from 'fs';
import fs_extra from 'fs-extra';
import _ from 'lodash';
import yaml from 'js-yaml';
import downloads from '@serverless-devs/downloads';
import { IInputs, IRegion, checkRegion } from '../../interface';
import FC, { GetApiType } from '../../resources/fc';
import { parseArgv } from '@serverless-devs/utils';
import path from 'path';
import logger from '../../logger';
import { TriggerType } from '../../interface/base';

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
      alias: { 'assume-yes': 'y' },
    });

    if (fs.existsSync(target) && !fs.statSync(target).isDirectory()) {
      throw new Error(`--target-dir "${target}" exists, but is not a directory`);
    }

    this.target = target;
    logger.debug(`target: ${target}`);
    this.qualifier = qualifier;
    logger.debug(`qualifier: ${qualifier}`);
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || _.get(inputs, 'props.functionName');
    logger.debug(`function name: ${this.functionName}`);
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
    });
  }

  async getTriggers(): Promise<any[]> {
    const result: any[] = [];
    const triggers = await this.fcSdk.listTriggers(this.functionName);
    logger.debug(triggers);
    for (const t of triggers) {
      let {
        triggerName,
        triggerType,
        description,
        qualifier,
        triggerConfig,
        invocationRole,
        sourceArn,
      } = t;
      triggerConfig = JSON.parse(triggerConfig);
      if (triggerType === TriggerType.eventbridge) {
        result.push({ triggerName, triggerType, description, qualifier, triggerConfig });
      } else {
        result.push({
          triggerName,
          triggerType,
          description,
          qualifier,
          invocationRole,
          sourceArn,
          triggerConfig,
        });
      }
    }
    return result;
  }

  async run() {
    const functionInfo = await this.fcSdk.getFunction(
      this.functionName,
      GetApiType.simpleUnsupported,
      this.qualifier,
    );
    const triggers = await this.getTriggers();
    let asyncInvokeConfig = {};
    try {
      asyncInvokeConfig = await this.fcSdk.getAsyncInvokeConfig(
        this.functionName,
        'LATEST',
        GetApiType.simpleUnsupported,
      );
    } catch (ex) {}
    return await this.write(functionInfo, triggers, asyncInvokeConfig);
  }

  async write(functionConfig: any, triggers: any, asyncInvokeConfig: any) {
    const syncFolderName = 'sync-clone';

    const baseDir = this.target
      ? this.target
      : path.join(this.inputs.baseDir || process.cwd(), syncFolderName);
    logger.debug(`sync base dir: ${baseDir}`);
    await fs_extra.removeSync(baseDir);
    logger.debug(`clear sync target path: ${baseDir}`);
    const codePath = path.join(baseDir, `${this.region}_${this.functionName}`);
    logger.debug(`sync code path: ${codePath}`);
    const ymlPath = path.join(baseDir, `${this.region}_${this.functionName}.yaml`);
    logger.debug(`sync yaml path: ${ymlPath}`);
    if (!FC.isCustomContainerRuntime(functionConfig.runtime)) {
      const { url } = await this.fcSdk.getFunctionCode(this.functionName, this.qualifier);

      await downloads(url, {
        dest: codePath,
        extract: true,
      });

      functionConfig.code = codePath;
    }

    if (functionConfig.role) {
      let role = functionConfig.role as string;
      functionConfig.role = role.toLowerCase();
    }

    let props = { region: this.region };
    props = Object.assign(props, functionConfig);
    if (!_.isEmpty(triggers)) {
      props['triggers'] = triggers;
    }
    if (!_.isEmpty(asyncInvokeConfig)) {
      props['asyncInvokeConfig'] = asyncInvokeConfig;
    }

    const config = {
      edition: '3.0.0',
      name: this.inputs.name,
      access: this.inputs.resource.access,
      resources: {
        [this.functionName]: {
          component: 'fc3',
          props: props,
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
  }
}
