import _ from 'lodash';
import fse from 'fs-extra';
import * as os from 'os';
import path from 'path';
import random from 'string-random';
import Pop from '@alicloud/pop-core';
import logger from '../../logger';
import { ICredentials } from '@serverless-devs/component-interface';
import { IRegion } from '../../interface';

const { ROAClient } = require('@alicloud/pop-core');

interface IDockerTmpConfig {
  dockerTmpUser: string;
  dockerTmpToken: string;
}

function getAcrClient(region: IRegion, credentials: ICredentials) {
  const acrClient = new ROAClient({
    accessKeyId: credentials?.AccessKeyID,
    accessKeySecret: credentials?.AccessKeySecret,
    securityToken: credentials?.SecurityToken,
    endpoint: `https://cr.${region}.aliyuncs.com`,
    apiVersion: '2016-06-07',
  });
  return acrClient;
}
async function getPopClient(
  credentials: ICredentials,
  endpoint: string,
  apiVersion: string,
): Promise<Pop> {
  return new Pop({
    endpoint,
    apiVersion,
    accessKeyId: credentials?.AccessKeyID,
    accessKeySecret: credentials?.AccessKeySecret,
    // @ts-ignore
    securityToken: credentials?.SecurityToken,
  });
}

async function getAuthorizationToken(region: IRegion, credentials: ICredentials): Promise<any> {
  const httpMethod = 'GET';
  const uriPath = '/tokens';
  const queries: any = {};
  const body = '';
  const headers: any = {
    'Content-Type': 'application/json',
  };
  const requestOption = {};
  const acrClient = getAcrClient(region, credentials);
  const response = await acrClient.request(
    httpMethod,
    uriPath,
    queries,
    body,
    headers,
    requestOption,
  );

  return {
    dockerTmpUser: response?.data?.tempUserName,
    dockerTmpToken: response?.data?.authorizationToken,
  };
}

async function createUserInfo(
  region: IRegion,
  credentials: ICredentials,
  pwd: string,
): Promise<any> {
  const httpMethod = 'PUT';
  const uriPath = '/users';
  const queries = {};
  const body = JSON.stringify({
    User: {
      Password: pwd,
    },
  });
  const headers = {
    'Content-Type': 'application/json',
  };
  const requestOption = {};
  const acrClient = getAcrClient(region, credentials);
  await acrClient.request(httpMethod, uriPath, queries, body, headers, requestOption);
}

async function getAuthorizationTokenOfRegisrty(
  region: IRegion,
  credentials: ICredentials,
): Promise<IDockerTmpConfig> {
  let response;
  try {
    response = await getAuthorizationToken(region, credentials);
  } catch (e) {
    if (
      e.statusCode === 401 ||
      e.statusCode === 404 ||
      e.result?.message === 'user is not exist.' ||
      e.result?.code === 'USER_NOT_EXIST'
    ) {
      // 子账号第一次需要先设置 Regisrty 的登陆密码后才能获取登录 Registry 的临时账号和临时密码
      // acr 密码要求: 8-32位，必须包含字母、符号或数字中的至少两项
      // 这里默认 uid:region:random(4) 生成一个初始密码
      const pwd = `${credentials.AccountID}_${random(4)}`;
      logger.info(
        `Aliyun ACR need the sub account to set password(init is ${pwd}) for logging in the registry https://cr.${region}.aliyuncs.com first if you want fc component to push image automatically`,
      );
      await createUserInfo(region, credentials, pwd);
      response = await getAuthorizationToken(region, credentials);
    } else {
      logger.error(`getAuthorizationToken error ${e}`);
      throw e;
    }
  }
  return response;
}

async function getAuthorizationTokenForAcrEE(
  region: IRegion,
  credentials: ICredentials,
  instanceID: string,
): Promise<IDockerTmpConfig> {
  const client = await getPopClient(credentials, `https://cr.${region}.aliyuncs.com`, '2018-12-01');
  const requestOption = {
    method: 'POST',
    formatParams: false,
  };

  const result: any = await client.request(
    'GetAuthorizationToken',
    { InstanceId: instanceID },
    requestOption,
  );
  // logger.debug(`GetAuthorizationToken result: ${JSON.stringify(result)}`);
  return {
    dockerTmpUser: result.TempUsername,
    dockerTmpToken: result.AuthorizationToken,
  };
}

async function getDockerConfigInformation() {
  // https://docs.docker.com/engine/reference/commandline/cli/
  // In general, it will use $HOME/.docker/config.json if the DOCKER_CONFIG environment variable is not specified,
  // and use $DOCKER_CONFIG/config.json otherwise.
  let dockerConfigPath = path.join(os.homedir(), '.docker', 'config.json');
  if (process.env.DOCKER_CONFIG) {
    dockerConfigPath = path.join(process.env.DOCKER_CONFIG, 'config.json');
  }
  logger.debug(`dockerConfigPath: ${dockerConfigPath}`);

  let fileContent = {};
  try {
    fileContent = await fse.readJSON(dockerConfigPath);
  } catch (e) {
    if (!e.message.includes('no such file or directory')) {
      throw e;
    }
  }
  return {
    fileContent,
    dockerConfigPath,
  };
}

async function setDockerConfigInformation(
  dockerConfigPath: string,
  fileContent: any,
  image: string,
  auth: string,
) {
  if (_.get(fileContent, `auths.${image}`)) {
    fileContent.auths[image].auth = auth;
  } else if (_.get(fileContent, 'auths')) {
    fileContent.auths[image] = { auth };
  } else {
    fileContent = {
      auths: { [image]: { auth } },
    };
  }

  await fse.outputFile(dockerConfigPath, JSON.stringify(fileContent, null, 2));
}

export async function mockDockerConfigFile(
  region: IRegion,
  imageName: string,
  credentials: ICredentials,
  instanceID: string,
) {
  const { fileContent, dockerConfigPath } = await getDockerConfigInformation();

  let dockerTmpConfig = await getDockerTmpUser(region, credentials, instanceID);
  const auth = Buffer.from(
    `${dockerTmpConfig.dockerTmpUser}:${dockerTmpConfig.dockerTmpToken}`,
  ).toString('base64');
  await setDockerConfigInformation(dockerConfigPath, fileContent, imageName.split('/')[0], auth);
}

export async function getDockerTmpUser(
  region: IRegion,
  credentials: ICredentials,
  instanceID: string,
): Promise<IDockerTmpConfig> {
  let dockerTmpConfig: IDockerTmpConfig;
  if (instanceID) {
    dockerTmpConfig = await getAuthorizationTokenForAcrEE(region, credentials, instanceID);
  } else {
    dockerTmpConfig = await getAuthorizationTokenOfRegisrty(region, credentials);
  }
  return dockerTmpConfig;
}

export async function getAcrEEInstanceID(
  region: IRegion,
  credentials: ICredentials,
  instanceName: string,
): Promise<string> {
  if (!instanceName) {
    return;
  }
  const defaultPageSize = 30;
  const client = await getPopClient(credentials, `https://cr.${region}.aliyuncs.com`, '2018-12-01');
  const requestOption = {
    method: 'GET',
    formatParams: false,
  };

  for (let i = 1; i < 100; i++) {
    const result: any = await client.request('ListInstance', { PageNo: i }, requestOption);
    logger.debug(`getAcrEEInstanceID result: ${JSON.stringify(result)}`);
    const totalCount = result['TotalCount'];
    const instances = result['Instances'];
    for (const inst of instances) {
      if (inst['InstanceName'] === instanceName) {
        if (inst['InstanceStatus'] !== 'RUNNING') {
          throw new Error(`AcrEE ${instanceName} Status is ${inst['InstanceStatus']}`);
        }
        logger.info(`getAcrEEInstanceID : ${inst['InstanceId']}`);
        return inst['InstanceId'];
      }
    }
    if (totalCount < i * defaultPageSize) {
      break;
    }
  }
  logger.error(`fail to getAcrEEInstanceID from ${instanceName}`);
  return '';
}

export async function getAcrImageMeta(
  region: IRegion,
  credentials: ICredentials,
  imageUrl: string,
  instanceID: string,
): Promise<boolean> {
  if (instanceID) {
    // TODO: ACREE 支持
    return false;
  } else {
    const httpMethod = 'GET';
    let li = imageUrl.split('/');
    const repoNameSpace = li[1];
    let li2 = li[2].split(':');
    const repoName = li2[0];
    const tag = li2[1];
    const uriPath = `/repos/${repoNameSpace}/${repoName}/tags/${tag}`;
    logger.debug(`getAcrImageMeta uriPath=${uriPath}`);
    const queries = {};
    const body = JSON.stringify({});
    const headers = {
      'Content-Type': 'application/json',
    };
    const requestOption = {};
    const acrClient = getAcrClient(region, credentials);
    try {
      let ret = await acrClient.request(httpMethod, uriPath, queries, body, headers, requestOption);
      logger.debug(`get ${imageUrl} meta ===> ${JSON.stringify(ret)}`);
      return true;
    } catch (e) {
      if (e.statusCode === 404) {
        logger.info(`${imageUrl} is not in Acr`);
      }
    }
    return false;
  }
}
