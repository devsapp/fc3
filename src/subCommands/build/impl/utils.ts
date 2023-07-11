import _ from 'lodash';

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
