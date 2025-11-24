import _ from 'lodash';
import { INasConfig, IVpcConfig, ILogConfig, Runtime, IOssMountConfig } from '../../../interface';
import { isAuto, isAutoVpcConfig } from '../../../utils';
import logger from '../../../logger';
import * as fs from 'fs';
import * as path from 'path';
import { isDebugMode } from '@serverless-devs/utils';

export function isCustomContainerRuntime(runtime: string): boolean {
  return runtime === Runtime['custom-container'];
}

export function isCustomRuntime(runtime: string): boolean {
  return (
    runtime === Runtime.custom ||
    runtime === Runtime['custom.debian10'] ||
    runtime === Runtime['custom.debian11'] ||
    runtime === Runtime['custom.debian12']
  );
}

/**
 * 在Windows上为node_modules/.bin目录中的文件设置可执行权限
 * @param codePath - 代码目录的路径
 */
export function setNodeModulesBinPermissions(codePath: string): void {
  if (process.platform !== 'win32') {
    return;
  }

  const nodeModulesBinPath = path.join(codePath, 'node_modules', '.bin');
  if (!fs.existsSync(nodeModulesBinPath)) {
    return;
  }

  try {
    const files = fs.readdirSync(nodeModulesBinPath);
    for (const file of files) {
      const filePath = path.join(nodeModulesBinPath, file);
      try {
        if (!fs.existsSync(filePath)) {
          continue;
        }
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          continue;
        }
        const newMode = stat.mode | 0o111;
        fs.chmodSync(filePath, newMode);
        logger.info(`Set executable permission for: ${filePath}`);
      } catch (fileError) {
        logger.debug(
          `Failed to set executable permission for: ${filePath}, error: ${fileError.message}`,
        );
      }
    }
  } catch (error) {
    logger.debug(`Failed to process node_modules/.bin directory, error: ${error.message}`);
  }
}

/**
 * 获取线上资源配置
 */
export function getRemoteResourceConfig(remote) {
  const remoteNasConfig = _.get(remote, 'nasConfig') as INasConfig;
  const remoteVpcConfig = _.get(remote, 'vpcConfig') as IVpcConfig;
  const remoteLogConfig = _.get(remote, 'logConfig') as ILogConfig;
  const remoteOssConfig = _.get(remote, 'ossMountConfig') as IOssMountConfig;
  const remoteRole = _.get(remote, 'role');
  return { remoteNasConfig, remoteVpcConfig, remoteLogConfig, remoteRole, remoteOssConfig };
}

/**
 * 计算当前local那些资源是 auto
 * @returns
 */
export function computeLocalAuto(local) {
  const nasAuto = isAuto(local.nasConfig);
  const vpcAuto = isAutoVpcConfig(local.vpcConfig) || (!local.vpcConfig && nasAuto);
  const slsAuto = isAuto(local.logConfig);
  const ossAuto = isAuto(local.ossMountConfig);
  // auto 是在 preDeploy 和 plan 之间的阶段设置的，用于提示
  // 如果用户设置了 auto 会在 handlePreRun 方法变成 arn
  const roleAuto =
    isAuto(local.role) || (_.isNil(local.role) && !_.isEmpty(local?.ossMountConfig?.mountPoints));
  return { nasAuto, vpcAuto, slsAuto, roleAuto, ossAuto };
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

  let protocol = 'https';
  if (isDebugMode()) {
    protocol = 'http';
  }

  if (!CUSTOM_ENDPOINT) {
    return { protocol };
  }

  // logger.info(`get custom endpoint: ${CUSTOM_ENDPOINT}`);

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
