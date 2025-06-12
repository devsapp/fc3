import _ from 'lodash';
import logger from '../../../logger';
import {
  computeLocalAuto,
  getRemoteResourceConfig,
  isCustomContainerRuntime,
  isCustomRuntime,
} from './utils';

// 注意 remote 为空时不能 set remote

export default function (_local: any, _remote: any) {
  const local = _.cloneDeep(_local);
  const remote = _.cloneDeep(_remote);
  logger.debug(`Pre init function local config: ${JSON.stringify(local)}`);

  // 线上配置如果存在，则需要将 auto 资源替换为线上资源配置
  if (remote) {
    const { remoteNasConfig, remoteVpcConfig, remoteLogConfig, remoteRole } =
      getRemoteResourceConfig(remote);
    const { nasAuto, vpcAuto, slsAuto, roleAuto } = computeLocalAuto(local);
    logger.debug(
      `Init local compute local auto, nasAuto: ${nasAuto}; vpcAuto: ${vpcAuto}; slsAuto: ${slsAuto}; roleAuto: ${roleAuto}`,
    );

    if (nasAuto && !_.isEmpty(remoteNasConfig?.mountPoints)) {
      _.set(local, 'nasConfig', remoteNasConfig);
    }

    if (vpcAuto) {
      if (
        _.isString(local.vpcConfig) &&
        _.toUpper(local.vpcConfig) === 'AUTO' &&
        remoteVpcConfig?.vpcId
      ) {
        // vpcConfig: auto
        _.set(local, 'vpcConfig', remoteVpcConfig);
      } else if (
        _.isObject(local.vpcConfig) &&
        local.vpcConfig?.vpcId &&
        remoteVpcConfig?.vpcId &&
        local.vpcConfig.vpcId === remoteVpcConfig.vpcId
      ) {
        if (
          _.isString(local.vpcConfig.vSwitchIds) &&
          _.toUpper(local.vpcConfig.vSwitchIds) === 'AUTO'
        ) {
          /*
            vpcConfig:
              vpcId: myVpcId
              vSwitchIds: auto
              securityGroupId:  auto | mysg
          */
          _.set(local, 'vpcConfig.vSwitchIds', remoteVpcConfig.vSwitchIds);
        }
        if (
          _.isString(local.vpcConfig.securityGroupId) &&
          _.toUpper(local.vpcConfig.securityGroupId) === 'AUTO'
        ) {
          /*
            vpcConfig:
              vpcId: myVpcId
              vSwitchIds: auto | [myvSwitchId]
              securityGroupId:  auto
          */
          _.set(local, 'vpcConfig.securityGroupId', remoteVpcConfig.securityGroupId);
        }
      }
      logger.debug(`replace function config: local vpcConfig = ${JSON.stringify(local.vpcConfig)}`);
    }

    if (slsAuto && !_.isEmpty(remoteLogConfig?.project)) {
      _.set(local, 'logConfig', remoteLogConfig);
    }

    if (!local.role) {
      if (roleAuto) {
        _.set(local, 'role', _.isString(remoteRole) && remoteRole !== '' ? remoteRole : 'auto');
      } else {
        _.set(local, 'role', '');
      }
    }

    if (remote.customContainerConfig) {
      _.unset(remote.customContainerConfig, 'resolvedImageUri');
    }

    _.unset(remote, 'lastUpdateStatus');
    _.unset(remote, 'state');
  }

  // 适配钩子函数配置
  if (!(_.isEmpty(local?.instanceLifecycleConfig) && _.isEmpty(remote?.instanceLifecycleConfig))) {
    const { initializer, preStop } = local.instanceLifecycleConfig || {};
    if (initializer?.handler && initializer?.command &&  !_.isEmpty(initializer?.command)) {
      throw new Error(
        'fc3 pre check: command and handler can not be set at the same time in lifecycle Lifecycle.Initializer',
      );
    }
    if (preStop?.handler && preStop?.command &&  !_.isEmpty(preStop?.command)) {
      throw new Error(
        'fc3 pre check: command and handler can not be set at the same time in lifecycle Lifecycle.PreStop',
      );
    }
    const initializerTimeout = _.get(remote, 'instanceLifecycleConfig.initializer.timeout', 3);
    if (
      remote?.instanceLifecycleConfig?.initializer?.handler ||
      remote?.instanceLifecycleConfig?.initializer?.command ||
      remote?.instanceLifecycleConfig?.initializer?.timeout
    ) {
      if (initializer?.handler || (initializer?.command && !_.isEmpty(initializer.command))) {
        if (remote?.instanceLifecycleConfig?.initializer?.handler && (initializer?.command && !_.isEmpty(initializer.command))) {
          _.set(local, 'instanceLifecycleConfig.initializer.handler', '');
        }
        if (remote?.instanceLifecycleConfig?.initializer?.command && initializer?.handler) {
          _.set(local, 'instanceLifecycleConfig.initializer.command', []);
        }
        if (!initializer.timeout) {
          _.set(local, 'instanceLifecycleConfig.initializer.timeout', initializerTimeout);
        }
      } else {
        _.set(local, 'instanceLifecycleConfig.initializer.handler', '');
        _.set(local, 'instanceLifecycleConfig.initializer.command', []);
        _.set(local, 'instanceLifecycleConfig.initializer.timeout', 3);
      }
    } else if ((initializer?.command || initializer?.handler) && !initializer.timeout) {
      _.set(local, 'instanceLifecycleConfig.initializer.timeout', initializerTimeout);
    }

    const preStopTimeout = _.get(remote, 'instanceLifecycleConfig.preStop.timeout', 3);
    if (
      remote?.instanceLifecycleConfig?.preStop?.handler ||
      remote?.instanceLifecycleConfig?.preStop?.command ||
      remote?.instanceLifecycleConfig?.preStop?.timeout
    ) {
      if (preStop?.handler || (preStop?.command && !_.isEmpty(preStop.command))) {
        if (remote?.instanceLifecycleConfig?.preStop?.handler && (preStop?.command && !_.isEmpty(preStop.command))) {
          _.set(local, 'instanceLifecycleConfig.preStop.handler', '');
        }
        if (remote?.instanceLifecycleConfig?.preStop?.command && preStop?.handler) {
          _.set(local, 'instanceLifecycleConfig.preStop.command', []);
        }
        if (!preStop.timeout) {
          _.set(local, 'instanceLifecycleConfig.preStop.timeout', preStopTimeout);
        }
      } else {
        _.set(local, 'instanceLifecycleConfig.preStop.handler', '');
        _.set(local, 'instanceLifecycleConfig.preStop.command', []);
        _.set(local, 'instanceLifecycleConfig.preStop.timeout', 3);
      }
    } else if ((preStop?.command || preStop?.handler) && !preStop.timeout) {
      _.set(local, 'instanceLifecycleConfig.preStop.timeout', preStopTimeout);
    }
  }

  // 如果 local 和 remote 都是 handler 和 command 为 '', 则从 props 中删除
  if (local?.instanceLifecycleConfig && remote?.instanceLifecycleConfig) {
    const { initializer: initializerL, preStop: preStopL } = local.instanceLifecycleConfig || {};
    const { initializer: initializerR, preStop: preStopR } = remote.instanceLifecycleConfig || {};
    if (
      initializerL?.handler === initializerR?.handler &&
      initializerL?.handler === '' &&
      _.isEqual(initializerL?.command, initializerR?.command) &&
      _.isEmpty(initializerL?.command)
    ) {
      _.unset(local, 'instanceLifecycleConfig.initializer');
      _.unset(remote, 'instanceLifecycleConfig.initializer');
    }
    if (
      preStopL?.handler === preStopR?.handler &&
      preStopL?.handler === '' &&
      _.isEqual(preStopL?.command, preStopR?.command) &&
      _.isEmpty(preStopL?.command)
    ) {
      _.unset(local, 'instanceLifecycleConfig.preStop');
      _.unset(remote, 'instanceLifecycleConfig.preStop');
    }
  }

  if (isCustomContainerRuntime(local.runtime)) {
    // 传入 code：InvalidArgument: code: 400, Either ossBucketName/ossObjectName or zipFile must be set
    _.unset(local, 'code');
    // plan 时会多出提示一个状态信息
    _.unset(remote, 'customContainerConfig.accelerationInfo');
  }

  if (isCustomContainerRuntime(local.runtime) || isCustomRuntime(local.runtime)) {
    // 不传入 handler：InvalidArgument: code: 400, Handler is required but not provided
    _.set(local, 'handler', local.handler || remote?.handler || 'handler');
    _.set(local, 'handler', local.handler || remote?.handler || 'handler');
  }

  logger.debug(`Post init local config: ${JSON.stringify(local)}`);
  return { local, remote };
}
