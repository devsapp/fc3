import _ from 'lodash';
import { FC_API_NOT_FOUND_ERROR_CODE } from '../../constant';

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

export const isAccessDenied = (ex) => ex.code === FC_API_NOT_FOUND_ERROR_CODE.AccessDenied;
