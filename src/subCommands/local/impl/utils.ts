// most copy from build, todo combine
import _ from 'lodash';
import http from 'http';
import fs from 'fs';
import { promisify } from 'util';
import logger from '../../../logger';

export function isAcreeRegistry(imageUrl: string): boolean {
  // 容器镜像企业服务
  const registry = _.split(imageUrl, '/')[0];
  return registry.includes('registry') && registry.endsWith('cr.aliyuncs.com');
}

export function isVpcAcrRegistry(imageUrl: string) {
  const imageArr = imageUrl.split('/');
  return imageArr[0].includes('registry-vpc');
}

export function vpcImage2InternetImage(imageUrl: string): string {
  const imageArr = imageUrl.split('/');
  if (isVpcAcrRegistry(imageUrl)) {
    imageArr[0] = _.replace(imageArr[0], `registry-vpc`, `registry`);
  }
  return imageArr.join('/');
}

export function getTimeZone(): string {
  const timeZone = 'UTC+' + (0 - new Date().getTimezoneOffset() / 60);
  return timeZone;
}

export function formatJsonString(str: string): string {
  try {
    const jsonObj = JSON.parse(str);
    const formattedStr = JSON.stringify(jsonObj, null, 0);
    return formattedStr;
  } catch (e) {
    return str;
  }
}

export async function downloadFile(url: string, filename: string) {
  try {
    const file = fs.createWriteStream(filename);
    const pipeline = promisify(require('stream').pipeline);
    const response = await http.get(url);
    await pipeline(response, file);
    logger.info(`${url}  ==>   ${filename} has been downloaded.`);
  } catch (err) {
    logger.error(`Error downloading file: ${err}`);
  }
}
