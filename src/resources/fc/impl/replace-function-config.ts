import _ from 'lodash';
import logger from '../../../logger';
import {
  computeLocalAuto,
  getRemoveResourceConfig,
  isCustomContainerRuntime,
  isCustomRuntime,
} from './utils';

// 注意 remote 为空时不能 set

export default function (_local: any, _remote: any) {
  const local = _.cloneDeep(_local);
  const remote = _.cloneDeep(_remote);
  logger.debug(`Pre init function local config: ${JSON.stringify(local)}`);

  // 线上配置如果存在，则需要将 auto 资源替换为线上资源配置
  if (remote) {
    const { remoteNasConfig, remoteVpcConfig, remoteLogConfig, remoteRole } =
      getRemoveResourceConfig(remote);
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

    if (roleAuto) {
      _.set(local, 'role', _.isString(remoteRole) && remoteRole !== '' ? remoteRole : 'auto');
    } else {
      _.set(local, 'role', '');
    }
  }

  if (isCustomContainerRuntime(local.runtime)) {
    if (!local.customContainerConfig?.accelerationType) {
      _.set(local, 'customContainerConfig.accelerationType', 'Default');
    }
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
