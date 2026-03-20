import _ from 'lodash';
import inquirer from 'inquirer';
import Table from 'tty-table';
import * as crc64 from 'crc64-ecma182.js';
import { promisify } from 'util';
import * as fs from 'fs';
import os from 'os';
import logger from '../logger';
import { execSync } from 'child_process';
import axios from 'axios';
import { FC_API_ERROR_CODE, isInvalidArgument } from '../resources/fc/error-code';
import path from 'path';
import downloads from '@serverless-devs/downloads';

export { default as verify } from './verify';
export { default as runCommand } from './run-command';

export async function downloadFile(url: string, filePath: string): Promise<void> {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading ZIP file: ${error.message}`);
    throw error;
  }
}

export const sleep = async (second: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, second * 1000));

export const isAuto = (config: unknown): boolean => {
  if (!_.isString(config)) {
    return false;
  }

  if (_.toUpper(config) === 'AUTO') {
    return true;
  }
  const autoConfig = config.split('|')[0];
  return _.toUpper(autoConfig) === 'AUTO';
};

export const parseAutoConfig = (
  config: string,
): { isAuto: boolean; params: Record<string, any> } => {
  if (!_.isString(config)) {
    return { isAuto: false, params: {} };
  }

  const parts = config.split('|');
  const baseConfig = parts[0];
  logger.debug(`parseAutoConfig, baseConfig = ${baseConfig}`);

  if (_.toUpper(baseConfig) === 'AUTO') {
    const params: Record<string, any> = {};
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].split('=');
      if (key && value) {
        const trimmedValue = value.trim();
        if (typeof trimmedValue === 'string') {
          try {
            params[key.trim()] = JSON.parse(trimmedValue);
          } catch (error) {
            params[key.trim()] = trimmedValue;
          }
        } else {
          params[key.trim()] = trimmedValue;
        }
      }
    }
    return { isAuto: true, params };
  }

  return { isAuto: false, params: {} };
};

export const isAutoVpcConfig = (config: unknown): boolean => {
  logger.debug(`isAutoVpcConfig, vpcConfig = ${JSON.stringify(config)}`);
  if (_.isString(config)) {
    return _.toUpper(config) === 'AUTO';
  }
  return (
    _.has(config, 'vpcId') &&
    (_.toUpper(_.get(config, 'vSwitchIds')) === 'AUTO' ||
      _.toUpper(_.get(config, 'securityGroupId')) === 'AUTO')
  );
};

export const getTimeZone = (): string => {
  const timeZone = `UTC+${0 - new Date().getTimezoneOffset() / 60}`;
  return timeZone;
};

export async function promptForConfirmOrDetails(message: string): Promise<boolean> {
  const answers: any = await inquirer.prompt([
    {
      type: 'list',
      name: 'prompt',
      message,
      choices: ['yes', 'no'],
    },
  ]);

  return answers.prompt === 'yes';
}

export function removeNullValues(obj: object) {
  for (const key in obj) {
    if (obj[key] === null) {
      _.unset(obj, key);
    } else if (typeof obj[key] === 'object') {
      removeNullValues(obj[key]);
    }
  }
}

export function tableShow(data: any, showKey: string[]) {
  const options = {
    borderStyle: 'solid',
    borderColor: 'blue',
    headerAlign: 'center',
    align: 'left',
    color: 'cyan',
    width: '100%',
  };

  const header = showKey.map((value) => ({
    value,
    headerColor: 'cyan',
    color: 'cyan',
    align: 'left',
    width: 'auto',
    formatter: (v: any) => v,
  }));

  console.log(Table(header, data, options).render());
}

export async function calculateCRC64(filePath: string) {
  const crc64Value = await promisify(crc64.crc64File)(filePath);
  return crc64Value;
}

export function getFileSize(filePath: string) {
  const fileSize = fs.statSync(filePath).size;
  const size = fileSize;
  const sizeInMB = Math.floor(size / (1024 * 1024));
  const sizeInGB = Math.floor(size / (1024 * 1024 * 1024));

  // 根据大小选择输出的单位
  if (sizeInGB > 0) {
    logger.debug(`Zip file: ${filePath} size = ${size / (1024 * 1024 * 1024)}GB`);
    return size / (1024 * 1024 * 1024);
  } else if (sizeInMB > 0) {
    logger.debug(`Zip file: ${filePath} size = ${size / (1024 * 1024)}MB`);
    return size / (1024 * 1024);
  } else {
    logger.debug(`Zip file: ${filePath} size = ${size / 1024}KB`);
    return size / 1024;
  }
}

export function checkDockerInstalled() {
  try {
    // 尝试执行 'docker --version' 命令
    const output = execSync('docker --version', { encoding: 'utf-8' });
    logger.debug('Docker is installed:', output.trim());
    return true;
  } catch (error) {
    // 如果执行命令出错，则认为 Docker 没有安装
    logger.error(
      'Docker is not installed, please refer "https://docs.docker.com/engine/install". if use podman, please refer "https://help.aliyun.com/document_detail/2513750.html?spm=a2c4g.2513735.0.i0#e72aae479a5gf"',
    );
    return false;
  }
}

export function checkDockerDaemonRunning(): boolean {
  try {
    // 使用 'docker info' 或 'docker ps' 都可以检查守护进程是否运行
    execSync('docker info', { encoding: 'utf-8' });
    // 如果能正确获取到输出，则表示Docker守护进程正在运行
    logger.debug('Docker daemon is running.');
    return true;
  } catch (error) {
    logger.error('Docker daemon is not running.');
    return false;
  }
}

export function checkDockerIsOK() {
  const isOK = checkDockerInstalled() && checkDockerDaemonRunning();
  if (!isOK) {
    throw new Error('Docker is not OK');
  }
}

export function isAppCenter(): boolean {
  return process.env.BUILD_IMAGE_ENV === 'fc-backend';
}

export function isYunXiao(): boolean {
  return process.env.ENGINE_PIPELINE_PORTAL_URL === 'https://flow.aliyun.com';
}

export function transformCustomDomainProps(local: any, region: string, functionName: string): any {
  const { domainName, protocol, certConfig, tlsConfig, authConfig, wafConfig } = local;
  let { route } = local;
  if (_.isEmpty(route)) {
    route = {};
  }
  route.functionName = functionName;
  const routeConfig = {
    routes: [route],
  };
  const _props = {
    region,
    domainName,
    protocol,
    certConfig,
    tlsConfig,
    authConfig,
    wafConfig,
    routeConfig,
  };
  const props = _.pickBy(_props, (value) => value !== undefined);
  return props;
}

const PROVISION_ERROR_CODES = [
  FC_API_ERROR_CODE.ProvisionConfigExist,
  FC_API_ERROR_CODE.ResidentScalingConfigExists,
];

export function isProvisionConfigError(error, functionName = '') {
  return (
    (error && error.code && PROVISION_ERROR_CODES.includes(error.code)) ||
    (error &&
      isInvalidArgument(error) &&
      error.message.includes(`Function '${functionName}' has been bound to resident source pool`))
  );
}

export function getUserAgent(userAgent: string, command: string) {
  const function_ai = isAppCenter() ? 'function_ai;' : '';
  if (userAgent) {
    return `${function_ai}${userAgent}`;
  }
  return `${function_ai}Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}command:${command}`;
}

/**
 * 验证并规范化路径
 */
export function checkFcDir(inputPath: string, paramName = 'path'): string {
  const normalizedPath = inputPath.trim();

  if (!normalizedPath.startsWith('/')) {
    throw new Error(`${paramName} does not start with '/'`);
  }

  // 检查路径长度
  if (normalizedPath.length > 128) {
    throw new Error(
      `${paramName} is too long (${normalizedPath.length}), maximum length is 128 characters`,
    );
  }

  // 检查不允许的系统目录前缀
  const forbiddenPrefixes = [
    '/bin',
    '/boot',
    '/dev',
    '/etc',
    '/lib',
    '/lib64',
    '/media',
    '/opt',
    '/proc',
    '/root',
    '/run',
    '/sbin',
    '/srv',
    '/sys',
    '/usr',
    '/var',
  ];

  for (const prefix of forbiddenPrefixes) {
    if (normalizedPath.startsWith(prefix)) {
      throw new Error(`Invalid ${paramName}, ${prefix} and its subdirectories are not allowed`);
    }
  }

  const isValidTwoLevelPath = /^\/[^/]+\/.+/.test(normalizedPath);
  if (!isValidTwoLevelPath) {
    throw new Error(`Invalid ${paramName}, path must be in /**/** format with at least two levels`);
  }

  return normalizedPath;
}

/**
 * 从URL下载文件到本地临时目录
 */
export async function _downloadFromUrl(url: string): Promise<string> {
  // 创建临时目录
  const tempDir = path.join(os.tmpdir(), 'fc_code_download');
  let downloadPath: string;

  try {
    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 从URL获取文件名
    const urlPath = new URL(url).pathname;
    const parsedPathName = path.parse(urlPath).name;
    const filename = path.basename(urlPath) || `downloaded_code_${Date.now()}`;
    downloadPath = path.join(tempDir, filename);

    await downloads(url, {
      dest: tempDir,
      filename: parsedPathName,
      extract: false,
    });

    logger.debug(`Downloaded file to: ${downloadPath}`);

    const isDownloadedFileZip = await isZipFile(downloadPath);
    if (!isDownloadedFileZip) {
      throw new Error(`Downloaded file is not a valid zip file: ${downloadPath}`);
    }

    return downloadPath.endsWith('.zip') ? downloadPath : `${downloadPath}.zip`;
  } catch (error) {
    // 如果下载失败，清理临时目录
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger.debug(`Cleaned up temporary directory after error: ${tempDir}`);
      }
    } catch (cleanupError) {
      logger.debug(`Failed to clean up temporary directory: ${cleanupError.message}`);
    }

    throw new Error(`Failed to download code from URL: ${error.message}`);
  }
}

/**
 * 判断文件是否为ZIP文件 - 通过魔数检查
 */
async function isZipFile(filePath: string): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    // 检查文件头部的魔数（而非扩展名）
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, 4, 0);
    } finally {
      fs.closeSync(fd);
    }

    // ZIP文件的魔数是 50 4B 03 04 (十六进制)
    const isZipMagicNumber =
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
      (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

    return isZipMagicNumber;
  } catch (error) {
    logger.debug(`Error checking if file is zip: ${error.message}`);
    return false;
  }
}
