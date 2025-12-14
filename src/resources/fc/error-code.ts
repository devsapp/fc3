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
  ResourcePoolInsufficientCapacity = 'ResourcePoolInsufficientCapacity', // 资源池无容量
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

const PROVISION_ERROR_CODES = [
  FC_API_ERROR_CODE.ProvisionConfigExist,
  FC_API_ERROR_CODE.ResidentScalingConfigExists,
];

const ERROR_MESSAGES = {
  GPU_TYPE_CHANGE: 'GPU type should not be changed with resident scaling config',
  GPU_TYPE_MISMATCH: (localGPUType, remoteGPUType) =>
    `function gpu type '${localGPUType}' doesn't match resident pool gpu type '${remoteGPUType}'`,
  IDLE_PROVISION_CONFIG: (functionName) =>
    `idle provision config exists for function '${functionName}'`,
  FUNCTION_BOUND_TO_POOL: (functionName) =>
    `Function '${functionName}' has been bound to resident source pool`,
};

const checkProvisionErrorCode = (ex) => {
  const code = ex?.code;
  return code && PROVISION_ERROR_CODES.includes(code);
};

const checkInvalidArgumentConditions = (ex, localGPUType, remoteGPUType, functionName) => {
  if (!isInvalidArgument(ex)) return false;

  const message = ex?.message;
  const code = ex?.code;

  return (
    message?.includes(ERROR_MESSAGES.GPU_TYPE_CHANGE) ||
    message?.includes(ERROR_MESSAGES.GPU_TYPE_MISMATCH(localGPUType, remoteGPUType)) ||
    message?.includes(ERROR_MESSAGES.IDLE_PROVISION_CONFIG(functionName)) ||
    code === FC_API_ERROR_CODE.ResourcePoolInsufficientCapacity ||
    message?.includes(ERROR_MESSAGES.FUNCTION_BOUND_TO_POOL(functionName))
  );
};

export const isFunctionScalingConfigError = (
  ex,
  { localGPUType = '', remoteGPUType = '', functionName = 'F' },
) => {
  return (
    checkProvisionErrorCode(ex) ||
    checkInvalidArgumentConditions(ex, localGPUType, remoteGPUType, functionName)
  );
};
