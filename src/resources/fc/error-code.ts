import _ from 'lodash';

export enum FC_API_ERROR_CODE {
  FunctionNotFound = 'FunctionNotFound', // 函数不存在
  FunctionAlreadyExists = 'FunctionAlreadyExists', // 函数已存在
  AccessDenied = 'AccessDenied', // 没有权限
  TriggerNotFound = 'TriggerNotFound', // 触发器不存在
  TriggerAlreadyExists = 'TriggerAlreadyExists', // 函数已存在
  AliasNotFound = 'AliasNotFound', // 别名不存在
  AliasAlreadyExists = 'AliasAlreadyExists', // 别名已存在
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

export const isAccessDenied = (ex) => ex.code === FC_API_ERROR_CODE.AccessDenied;
