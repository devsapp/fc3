import _ from 'lodash';
import {
  INasConfig,
  IVpcConfig,
  ILogConfig,
  Runtime,
  ICustomContainerConfig,
} from '../../../interface';
import { isAuto } from '../../../utils';
import logger from '../../../logger';

export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === Runtime['custom-container'];
}

export function isCustomRuntime(runtime: string): boolean {
  return runtime === Runtime['custom'] || runtime === Runtime['custom.debian10'];
}

/**
 * 获取线上资源配置
 */
export function getRemoteResourceConfig(remote) {
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
  // auto 是在 preDeploy 和 plan 之间的阶段设置的，用于提示
  //      如果用户设置了 auto 会在 handlePreRun 方法变成 arn
  const roleAuto =
    isAuto(local.role) || (_.isNil(local.role) && !_.isEmpty(local?.ossMountConfig?.mountPoints));
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
  return !!(acrInstanceID && image.endsWith('_accelerated'));
}

/**
 * 处理自定义 endpoint
 * @returns
 */
export const getCustomEndpoint = (
  endpoint?: string,
): { host?: string; endpoint?: string; protocol?: string } => {
  const CUSTOM_ENDPOINT = endpoint || process.env.FC_CLIENT_CUSTOM_ENDPOINT;
  logger.debug(`get custom endpoint: ${CUSTOM_ENDPOINT}`);

  if (!CUSTOM_ENDPOINT) {
    return {};
  }
  logger.info(`get custom endpoint: ${CUSTOM_ENDPOINT}`);

  if (CUSTOM_ENDPOINT.startsWith('http://')) {
    return {
      protocol: 'http',
      host: CUSTOM_ENDPOINT.replace('http://', ''),
      endpoint: CUSTOM_ENDPOINT,
    };
  }

  if (CUSTOM_ENDPOINT.startsWith('https://')) {
    return {
      protocol: 'https',
      host: CUSTOM_ENDPOINT.replace('https://', ''),
      endpoint: CUSTOM_ENDPOINT,
    };
  }

  return {
    protocol: 'https',
    host: endpoint,
    endpoint: `https://${endpoint}`,
  };
};
