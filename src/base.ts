import _ from 'lodash';
import { IInputs } from './interface';
import Logger from './logger';
import logger from './logger';
import Ram from './resources/ram';
import { FUNCTION_CUSTOM_DEFAULT_CONFIG, FUNCTION_DEFAULT_CONFIG } from './default/config';
import path from 'path';
import commandsHelp from './commands-help';
import FC from './resources/fc';
import { ICredentials } from '@serverless-devs/component-interface';
import Role from './resources/ram';

export default class Base {
  commands: any;

  constructor({ logger }: any) {
    Logger._set(logger);

    this.commands = commandsHelp;
  }

  // 在运行方法之前运行
  async handlePreRun(inputs: IInputs, needCredential: boolean) {
    logger.debug(`input: ${JSON.stringify(inputs)}`);
    // fc组件镜像 trim 左右空格
    const image = _.get(inputs, 'props.function.customContainerConfig.image');
    if (!_.isEmpty(image)) {
      _.set(inputs, 'props.function.customContainerConfig.image', _.trim(image));
    }

    const role = _.get(inputs, 'props.function.role');
    const functionRole = await this.handleRole(role, needCredential, inputs);
    _.set(inputs, 'props.function.role', functionRole);

    inputs.baseDir = path.dirname(inputs.yaml?.path || process.cwd());
    logger.debug(`baseDir is: ${inputs.baseDir}`);

    if (!_.isEmpty(inputs.props.function)) {
      if (
        FC.isCustomContainerRuntime(inputs.props.function.runtime) ||
        FC.isCustomRuntime(inputs.props.function.runtime)
      ) {
        inputs.props.function = _.defaults(inputs.props.function, FUNCTION_CUSTOM_DEFAULT_CONFIG);
      } else {
        inputs.props.function = _.defaults(inputs.props.function, FUNCTION_DEFAULT_CONFIG);
      }
    }

    const triggers = _.cloneDeep(_.get(inputs, 'props.triggers', []));
    for (const index in triggers) {
      let trigger = triggers[index];
      const role = _.get(trigger, 'invocationRole');
      let triggerRole = await this.handleRole(role, needCredential, inputs);
      if (triggerRole === undefined) {
        triggerRole = await this.handleDefaultTriggerRole(inputs, trigger);
      }
      if (triggerRole !== undefined) {
        _.set(trigger, 'invocationRole', triggerRole);
        inputs['props']['triggers'][index] = trigger;
      }
    }
    logger.debug(`handle pre run config: ${JSON.stringify(inputs.props)}`);
  }

  private async handleRole(
    role: string,
    needCredential: boolean,
    inputs: IInputs,
  ): Promise<string> {
    const needHandleRole = _.isString(role) && role !== '' && !Role.isRoleArnFormat(role);
    if (needCredential || needHandleRole) {
      if (_.isEmpty(inputs.credential)) {
        inputs.credential = await inputs.getCredential();
      }
      if (needHandleRole) {
        const arn = Role.completionArn(role, (inputs.credential as ICredentials).AccountID);
        return arn.toLowerCase();
      }
    }
    if (role === undefined) {
      return role;
    }
    return role.toLowerCase();
  }

  /* 针对 trigger role,  如果在 yaml 中不填写 trigger role
    1. OSS、SLS、CDN、TableStore、MNS_TOPIC 触发器, GetOrCreate 和控制台一样的 default trigger role
    2. 针对 EB 触发器，GetOrCreate 和控制台一样的 service linked role
  */
  private async handleDefaultTriggerRole(inputs: IInputs, trigger: any): Promise<string> {
    let triggerRole = undefined;
    const triggerType = _.get(trigger, 'triggerType');
    if (_.isEmpty(inputs.credential)) {
      inputs.credential = await inputs.getCredential();
    }
    const ramClient = new Ram(inputs.credential as ICredentials).client;
    switch (triggerType) {
      case 'oss':
        triggerRole = await ramClient.initFcOssTriggerRole();
        break;
      case 'sls':
        triggerRole = await ramClient.initFcSlsTriggerRole();
        break;
      case 'mns_topic':
        triggerRole = await ramClient.initFcMnsTriggerRole();
        break;
      case 'cdn_events':
        triggerRole = await ramClient.initFcCdnTriggerRole();
        break;
      case 'tablestore':
        triggerRole = await ramClient.initFcOtsTriggerRole();
        break;
      case 'eventbridge': // eb 触发器没有 trigger role, get or create slr role
        const eventSourceType = trigger.triggerConfig.eventSourceConfig.eventSourceType;
        await ramClient.initSlrRole(eventSourceType.toUpperCase());
        break;
      default:
        logger.debug(`${triggerType} don't have default trigger role`);
    }
    if (triggerRole === undefined) {
      return triggerRole;
    }
    triggerRole = triggerRole.toLowerCase();
    logger.info(`triggerName = ${trigger.triggerName} use default triggerRole = ${triggerRole}`);
    return triggerRole;
  }
}
