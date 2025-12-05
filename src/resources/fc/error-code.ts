import _ from 'lodash';

export enum FC_API_ERROR_CODE {
  FunctionNotFound = 'FunctionNotFound', // 函数不存在
  FunctionAlreadyExists = 'FunctionAlreadyExists', // 函数已存在
  AccessDenied = 'AccessDenied', // 没有权限
  TriggerNotFound = 'TriggerNotFound', // 触发器不存在
  TriggerAlreadyExists = 'TriggerAlreadyExists', // 函数已存在
  AliasNotFound = 'AliasNotFound', // 别名不存在
  AliasAlreadyExists = 'AliasAlreadyExists', // 别名已存在
  ProvisionConfigExist = 'ProvisionConfigExist', // 预配置存在
  ResidentScalingConfigExists = 'ResidentScalingConfigExists', // 常驻资源池预配置存在
}

export const isSlsNotExistException = (project: string, logstore: string, ex) => {
  if (
    _.startsWith(
      ex?.message,
      `InvalidArgument: code: 400, project '${project}' does not exist request id:`,
    )
  ) {
    return true;
  }

  if (
    _.startsWith(
      ex?.message,
      `InvalidArgument: code: 400, logstore '${logstore}' does not exist request id:`,
    )
  ) {
    return true;
  }

  return false;
};

export const isAccessDenied = (ex) => ex.statusCode === 403;

export const isInvalidArgument = (ex) => ex.statusCode === 400;

export const isFailedState = (ex) => {
  if (_.startsWith(ex.message, 'retry to wait function state ok failed reach 3 times')) {
    return true;
  }
  return false;
};

export const isFunctionStateWaitTimedOut = (ex) => {
  if (_.startsWith(ex.message, 'retry to wait function state ok timeout')) {
    return true;
  }
  return false;
};

export const isFunctionScalingConfigError = (
  ex,
  { localGPUType = '', remoteGPUType = '', functionName = 'F' },
) => {
  if (
    (isInvalidArgument(ex) &&
      ex.message.includes('GPU type should not be changed with resident scaling config')) ||
    ex.message.includes(
      `function gpu type '${localGPUType}' doesn't match resident pool gpu type '${remoteGPUType}'`,
    ) ||
    ex.message.includes(`idle provision config exists for function '${functionName}'`)
  ) {
    return true;
  }
  return false;
};
