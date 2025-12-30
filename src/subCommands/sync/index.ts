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
import { getUserAgent } from '../../utils';

export default class Sync {
  private region: IRegion;
  private functionName: string;
  private fcSdk: FC;
  private target: string;
  private qualifier: string;
  private disable_list_remote_eb_triggers: string;
  private disable_list_remote_alb_triggers: string;

  constructor(private inputs: IInputs) {
    const {
      'target-dir': target,
      'function-name': functionName,
      qualifier,
      region,
      'disable-list-remote-eb-triggers': disable_list_remote_eb_triggers,
      'disable-list-remote-alb-triggers': disable_list_remote_alb_triggers,
    } = parseArgv(inputs.args, {
      string: [
        'target-dir',
        'function-name',
        'qualifier',
        'region',
        'disable-list-remote-eb-triggers',
        'disable-list-remote-alb-triggers',
      ],
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
    this.disable_list_remote_eb_triggers = disable_list_remote_eb_triggers;
    logger.debug(`disable_list_remote_eb_triggers: ${disable_list_remote_eb_triggers}`);
    this.disable_list_remote_alb_triggers = disable_list_remote_alb_triggers;
    logger.debug(`disable_list_remote_alb_triggers: ${disable_list_remote_alb_triggers}`);
    if (!this.functionName) {
      throw new Error('Function name not specified, please specify --function-name');
    }
    const userAgent = getUserAgent(inputs.userAgent, 'sync');
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });
  }

  async getTriggers(): Promise<any[]> {
    const result: any[] = [];
    const triggers = await this.fcSdk.listTriggers(
      this.functionName,
      this.disable_list_remote_eb_triggers,
      this.disable_list_remote_alb_triggers,
    );
    logger.debug(triggers);
    for (const t of triggers) {
      const { triggerName, triggerType, description, qualifier, invocationRole, sourceArn } = t;
      const triggerConfig = JSON.parse(t.triggerConfig);
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
    let vpcBindingConfig = {};
    let concurrencyConfig = {};
    let provisionConfig = {};
    let scalingConfig = {};
    try {
      asyncInvokeConfig = await this.fcSdk.getAsyncInvokeConfig(
        this.functionName,
        'LATEST',
        GetApiType.simpleUnsupported,
      );
    } catch (ex) {
      // eslint-disable-next-line no-empty
    }

    try {
      provisionConfig = await this.fcSdk.getFunctionProvisionConfig(this.functionName, 'LATEST');
    } catch (ex) {
      // eslint-disable-next-line no-empty
    }

    try {
      scalingConfig = await this.fcSdk.getFunctionScalingConfig(this.functionName, 'LATEST');
    } catch (ex) {
      // eslint-disable-next-line no-empty
    }

    try {
      concurrencyConfig = await this.fcSdk.getFunctionConcurrency(this.functionName);
    } catch (ex) {
      // eslint-disable-next-line no-empty
    }

    try {
      vpcBindingConfig = await this.fcSdk.getVpcBinding(
        this.functionName,
        GetApiType.simpleUnsupported,
      );
    } catch (ex) {
      // eslint-disable-next-line no-empty
    }
    return await this.write(
      functionInfo,
      triggers,
      asyncInvokeConfig,
      vpcBindingConfig,
      concurrencyConfig,
      provisionConfig,
      scalingConfig,
    );
  }

  async write(
    functionConfig: any,
    triggers: any,
    asyncInvokeConfig: any,
    vpcBindingConfig: any,
    concurrencyConfig: any,
    provisionConfig: any,
    scalingConfig: any,
  ) {
    const syncFolderName = 'sync-clone';

    const baseDir = this.target
      ? this.target
      : path.join(this.inputs.baseDir || process.cwd(), syncFolderName);
    logger.debug(`sync base dir: ${baseDir}`);
    const codePath = path.join(baseDir, `${this.region}_${this.functionName}`).replace('$', '_');
    logger.debug(`sync code path: ${codePath}`);
    const ymlPath = path
      .join(baseDir, `${this.region}_${this.functionName}.yaml`)
      .replace('$', '_');
    logger.debug(`sync yaml path: ${ymlPath}`);
    if (!FC.isCustomContainerRuntime(functionConfig.runtime)) {
      const { url } = await this.fcSdk.getFunctionCode(this.functionName, this.qualifier);

      await fs_extra.removeSync(codePath);
      logger.debug(`clear sync code path: ${codePath}`);

      let codeUrl = url;
      if (process.env.FC_REGION === this.region) {
        codeUrl = url.replace('.aliyuncs.com', '-internal.aliyuncs.com');
      }

      await downloads(codeUrl, {
        dest: codePath,
        extract: true,
      });

      // eslint-disable-next-line require-atomic-updates, no-param-reassign
      functionConfig.code = codePath;
    }

    if (functionConfig.role) {
      const role = functionConfig.role as string;
      // eslint-disable-next-line no-param-reassign
      functionConfig.role = role.toLowerCase();
    }

    if (functionConfig.customContainerConfig) {
      _.unset(functionConfig.customContainerConfig, 'resolvedImageUri');
    }

    _.unset(functionConfig, 'lastUpdateStatus');
    _.unset(functionConfig, 'state');

    let props: any = { region: this.region };
    props = Object.assign(props, functionConfig);
    if (!_.isEmpty(triggers)) {
      props.triggers = triggers;
    }
    if (!_.isEmpty(asyncInvokeConfig)) {
      props.asyncInvokeConfig = asyncInvokeConfig;
    }

    if (!_.isEmpty(provisionConfig)) {
      _.unset(provisionConfig, 'current');
      _.unset(provisionConfig, 'currentError');
      _.unset(provisionConfig, 'functionArn');
      const isElasticInstance =
        provisionConfig.alwaysAllocateCPU === true && provisionConfig.alwaysAllocateGPU === true;

      if (isElasticInstance) {
        props.provisionConfig = provisionConfig;
      } else if (!_.isEmpty(scalingConfig)) {
        _.unset(scalingConfig, 'currentError');
        _.unset(scalingConfig, 'currentInstances');
        _.unset(scalingConfig, 'targetInstances');
        _.unset(scalingConfig, 'enableOnDemandScaling');
        _.unset(scalingConfig, 'functionArn');
        props.scalingConfig = scalingConfig;
      } else {
        throw new Error('ScalingConfig not found');
      }
    }

    if (!_.isEmpty(concurrencyConfig)) {
      _.unset(concurrencyConfig, 'functionArn');
      props.concurrencyConfig = concurrencyConfig;
    }

    if (!_.isEmpty(vpcBindingConfig)) {
      const vpcIds = _.get(functionConfig.vpcBinding, 'vpcIds', []);
      if (vpcIds.length > 0) {
        props.vpcBinding = vpcBindingConfig;
      }
    }

    const config = {
      edition: '3.0.0',
      name: this.inputs.name,
      access: this.inputs.resource.access,
      resources: {
        [this.functionName]: {
          component: 'fc3',
          props,
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
