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

    if (vpcAuto && remoteVpcConfig?.vpcId) {
      _.set(local, 'vpcConfig', remoteVpcConfig);
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

    if (remote.layers) {
      const layers: any[] = [];
      for (let i = 0; i < remote.layers.length; i++) {
        const layer = remote.layers[i];
        layers.push(layer.arn);
      }
      _.unset(remote, 'layers');
      _.set(remote, 'layers', layers);
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
    const initializerTimeout = _.get(remote, 'instanceLifecycleConfig.initializer.timeout', 3);
    if (
      remote?.instanceLifecycleConfig?.initializer?.handler ||
      remote?.instanceLifecycleConfig?.initializer?.timeout
    ) {
      if (initializer?.handler) {
        if (!initializer.timeout) {
          _.set(local, 'instanceLifecycleConfig.initializer.timeout', initializerTimeout);
        }
      } else {
        _.set(local, 'instanceLifecycleConfig.initializer.handler', '');
        _.set(local, 'instanceLifecycleConfig.initializer.timeout', 3);
      }
    } else if (initializer?.handler && !initializer.timeout) {
      _.set(local, 'instanceLifecycleConfig.initializer.timeout', initializerTimeout);
    }

    const preStopTimeout = _.get(remote, 'instanceLifecycleConfig.preStop.timeout', 3);
    if (
      remote?.instanceLifecycleConfig?.preStop?.handler ||
      remote?.instanceLifecycleConfig?.preStop?.timeout
    ) {
      if (preStop?.handler) {
        if (!preStop.timeout) {
          _.set(local, 'instanceLifecycleConfig.preStop.timeout', preStopTimeout);
        }
      } else {
        _.set(local, 'instanceLifecycleConfig.preStop.handler', '');
        _.set(local, 'instanceLifecycleConfig.preStop.timeout', 3);
      }
    } else if (preStop?.handler && !preStop.timeout) {
      _.set(local, 'instanceLifecycleConfig.preStop.timeout', preStopTimeout);
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
