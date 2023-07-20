import _ from 'lodash';
import {
  INasConfig,
  IVpcConfig,
  ILogConfig,
  Runtime,
  ICustomContainerConfig,
} from '../../interface';
import { isAuto } from '../../utils';

export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === Runtime['custom-container'];
}

export function isCustomRuntime(runtime: string): boolean {
  return runtime === Runtime['custom'] || runtime === Runtime['custom.debian10'];
}

/**
 * 获取线上资源配置
 */
export function getRemoveResourceConfig(remote) {
  const remoteNasConfig = _.get(remote, 'nasConfig') as INasConfig;
  const remoteVpcConfig = _.get(remote, 'vpcConfig') as IVpcConfig;
  const remoteLogConfig = _.get(remote, 'logConfig') as ILogConfig;
  const remoteRole = _.get(remote, 'role');
  return { remoteNasConfig, remoteVpcConfig, remoteLogConfig, remoteRole };
}

/**
 * 计算当前local那些资源是 auto
 * @returns
 */
export function computeLocalAuto(local) {
  const nasAuto = isAuto(local.nasConfig);
  const vpcAuto = isAuto(local.vpcConfig) || (!local.vpcConfig && nasAuto);
  const slsAuto = isAuto(local.logConfig);
  const roleAuto =
    isAuto(local.role) ||
    (_.isNil(local.role) &&
      (nasAuto || vpcAuto || slsAuto || isCustomContainerRuntime(local?.runtime)));
  return { nasAuto, vpcAuto, slsAuto, roleAuto };
}

/**
 * 是否启用了镜像加速
 */
export function isContainerAccelerated(customContainerConfig: ICustomContainerConfig): boolean {
  if (_.isEmpty(customContainerConfig)) {
    return false;
  }
  const acrInstanceID = _.get(customContainerConfig, 'acrInstanceID');
  const image = _.get(customContainerConfig, 'image', '');
  return acrInstanceID && image.endsWith('_accelerated');
}
