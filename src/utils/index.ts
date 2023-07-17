import _ from 'lodash';
import { Runtime } from '../interface';

export { default as getFcClient } from './fc-client';
export { default as verify } from './verify';
export * as acr from './acr';
export { runCommand } from './run-command';

export const sleep = async (timer: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, timer));

export const isAuto = (config: unknown): boolean => {
  if (!_.isString(config)) {
    return false;
  }
  
  return _.toUpper(config) === 'AUTO';
}

export function getTimeZone(): string {
  const timeZone = 'UTC+' + (0 - new Date().getTimezoneOffset() / 60);
  return timeZone;
}

export const isContainer = (runtime: string): boolean => runtime === Runtime['custom-container'];
