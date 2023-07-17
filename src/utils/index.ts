import _ from 'lodash';

export { default as verify } from './verify';
export { runCommand } from './run-command';

export const sleep = async (timer: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, timer));

export const isAuto = (config: unknown): boolean => {
  if (!_.isString(config)) {
    return false;
  }

  return _.toUpper(config) === 'AUTO';
};

export const getTimeZone = (): string => {
  const timeZone = 'UTC+' + (0 - new Date().getTimezoneOffset() / 60);
  return timeZone;
};
