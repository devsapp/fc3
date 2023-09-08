import _ from 'lodash';
import inquirer from 'inquirer';
import Table from 'tty-table';

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
  for (let key in obj) {
    if (obj[key] === null) {
      delete obj[key];
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
