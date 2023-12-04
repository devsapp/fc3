import _ from 'lodash';
import inquirer from 'inquirer';
import Table from 'tty-table';
import * as crc64 from 'crc64-ecma182.js';
import { promisify } from 'util';
import * as fs from 'fs';
import logger from '../logger';

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
  const timeZone = `UTC+${0 - new Date().getTimezoneOffset() / 60}`;
  return timeZone;
};

export async function promptForConfirmOrDetails(message: string): Promise<boolean> {
  const answers: any = await inquirer.prompt([
    {
      type: 'list',
      name: 'prompt',
      message,
      choices: ['yes', 'no'],
    },
  ]);

  return answers.prompt === 'yes';
}

export function removeNullValues(obj: object) {
  for (const key in obj) {
    if (obj[key] === null) {
      _.unset(obj, key);
    } else if (typeof obj[key] === 'object') {
      removeNullValues(obj[key]);
    }
  }
}

export function tableShow(data: any, showKey: string[]) {
  const options = {
    borderStyle: 'solid',
    borderColor: 'blue',
    headerAlign: 'center',
    align: 'left',
    color: 'cyan',
    width: '100%',
  };

  const header = showKey.map((value) => ({
    value,
    headerColor: 'cyan',
    color: 'cyan',
    align: 'left',
    width: 'auto',
    formatter: (v: any) => v,
  }));

  console.log(Table(header, data, options).render());
}

export async function calculateCRC64(filePath: string) {
  const crc64Value = await promisify(crc64.crc64File)(filePath);
  return crc64Value;
}

export function getFileSize(filePath: string) {
  const fileSize = fs.statSync(filePath).size;
  const size = fileSize;
  const sizeInKB = Math.floor(size / 1024);
  const sizeInMB = Math.floor(size / (1024 * 1024));
  const sizeInGB = Math.floor(size / (1024 * 1024 * 1024));

  // 根据大小选择输出的单位
  if (sizeInGB > 0) {
    logger.debug(`Zip file: ${filePath} size = ${sizeInGB}GB`);
    return sizeInGB;
  } else if (sizeInMB > 0) {
    logger.debug(`Zip file: ${filePath} size = ${sizeInMB}MB`);
    return sizeInMB;
  } else {
    logger.debug(`Zip file: ${filePath} size = ${sizeInKB}KB`);
    return sizeInKB;
  }
}
