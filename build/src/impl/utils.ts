import { ICodeUri } from './interface';
import logger from '../common/logger';
import { lodash as _ } from '@serverless-devs/core';

export function checkCodeUri(codeUri: string | ICodeUri): string {
  if (!codeUri) {
    return '';
  }

  const src: string = _.isString(codeUri) ? codeUri as string : (codeUri as ICodeUri).src;

  if (!src) {
    logger.info('No Src configured, skip building.');
    return '';
  }

  if (_.endsWith(src, '.zip') || _.endsWith(src, '.jar') || _.endsWith(src, '.war')) {
    logger.info('Artifact configured, skip building.');
    return '';
  }
  return src;
}

export function isAcreeRegistry(imageUrl: string): boolean { // 容器镜像企业服务
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