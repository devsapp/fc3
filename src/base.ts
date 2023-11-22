/* eslint-disable no-param-reassign */
/* eslint-disable require-atomic-updates */
/* eslint-disable no-await-in-loop */
import _ from 'lodash';
import { IInputs } from './interface';
// eslint-disable-next-line @typescript-eslint/no-shadow
import log from './logger';
import { FUNCTION_CUSTOM_DEFAULT_CONFIG, FUNCTION_DEFAULT_CONFIG } from './default/config';
import path from 'path';
import commandsHelp from './commands-help';
import FC from './resources/fc';
import { ICredentials } from '@serverless-devs/component-interface';
import Role, { RamClient } from './resources/ram';
import { TriggerType } from './interface/base';

export default class Base {
  commands: any;
  constructor({ logger }: any) {
    log._set(logger);

    this.commands = commandsHelp;
  }

  // 在运行方法之前运行
  async handlePreRun(inputs: IInputs, needCredential: boolean) {
    log.debug(`input: ${JSON.stringify(inputs)}`);
    // fc组件镜像 trim 左右空格
    const image = _.get(inputs, 'props.customContainerConfig.image');
    if (!_.isEmpty(image)) {
      _.set(inputs, 'props.customContainerConfig.image', _.trim(image));
    }

    const role = _.get(inputs, 'props.role');
    const functionRole = await this.handleRole(role, needCredential, inputs);
    _.set(inputs, 'props.role', functionRole);

    if (inputs.yaml?.path) {
      inputs.baseDir = path.dirname(inputs.yaml?.path);
    } else {
      inputs.baseDir = process.cwd();
    }
    log.debug(`baseDir is: ${inputs.baseDir}`);

    if (
      FC.isCustomContainerRuntime(inputs.props.runtime) ||
      FC.isCustomRuntime(inputs.props.runtime)
    ) {
      inputs.props = _.defaults(inputs.props, FUNCTION_CUSTOM_DEFAULT_CONFIG);
    } else {
      inputs.props = _.defaults(inputs.props, FUNCTION_DEFAULT_CONFIG);
    }

    const triggers = _.cloneDeep(_.get(inputs, 'props.triggers', []));
    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      const invocationRole = _.get(trigger, 'invocationRole');
      let triggerRole = await this.handleRole(invocationRole, needCredential, inputs);
      if (triggerRole === undefined) {
        triggerRole = await this.handleDefaultTriggerRole(inputs, trigger);
      }
      if (triggerRole !== undefined) {
        _.set(trigger, 'invocationRole', triggerRole);
        inputs.props.triggers[i] = trigger;
      }
    }
    log.debug(`handle pre run config: ${JSON.stringify(inputs.props)}`);
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
    let triggerRole;
    const triggerType = _.get(trigger, 'triggerType');
    if (_.isEmpty(inputs.credential)) {
      inputs.credential = await inputs.getCredential();
    }
    const ramClient = new RamClient(inputs.credential as ICredentials);
    switch (triggerType) {
      case TriggerType.oss:
        triggerRole = await ramClient.initFcOssTriggerRole();
        break;
      case TriggerType.log:
        triggerRole = await ramClient.initFcSlsTriggerRole();
        break;
      case TriggerType.mns_topic:
        triggerRole = await ramClient.initFcMnsTriggerRole();
        break;
      case TriggerType.cdn_events:
        triggerRole = await ramClient.initFcCdnTriggerRole();
        break;
      case TriggerType.tablestore:
        triggerRole = await ramClient.initFcOtsTriggerRole();
        break;
      case TriggerType.eventbridge: {
        // eb 触发器没有 trigger role, get or create slr role
        const { eventSourceType } = trigger.triggerConfig.eventSourceConfig;
        await ramClient.initSlrRole('SENDTOFC');
        await ramClient.initSlrRole(eventSourceType.toUpperCase());
        break;
      }
      default:
        log.debug(`${triggerType} don't have default trigger role`);
    }
    if (triggerRole === undefined) {
      return triggerRole;
    }
    triggerRole = triggerRole.toLowerCase();
    log.info(`triggerName = ${trigger.triggerName} use default triggerRole = ${triggerRole}`);
    return triggerRole;
  }
}
