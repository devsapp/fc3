import _ from 'lodash';

export { default as verify } from './verify';
export { default as runCommand } from './run-command';

export const sleep = async (second: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, second * 1000));

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
