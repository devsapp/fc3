import _ from 'lodash';

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
