import { spawn } from 'child_process';
import { isDebug } from '../const';
import logger from '../../common/logger';

export async function runCommand(command: string, shellScript?: string, showStdout?: boolean) {
  logger.debug(`runCommand command = ${command}`);
  const [cmd, ...args] = command.split(' ');
  logger.debug(`runCommand cmd = ${cmd}`);
  if (shellScript) {
    args.push(shellScript);
  }
  logger.debug(`runCommand args = ${args}`);

  return new Promise<void>((resolve, reject) => {
    const dProcess = spawn(cmd, args);

    dProcess.stdout.on('data', (data) => {
      if (isDebug || showStdout) {
        console.log(data.toString());
      }
    });

    dProcess.stderr.on('data', (data) => {
      const warnErrrMsg = data.toString();
      console.error(warnErrrMsg);
    });

    dProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`command failed with code ${code}`));
      }
    });
  });
}
