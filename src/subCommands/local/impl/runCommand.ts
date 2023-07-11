import { spawn } from 'child_process';
import { isDebug } from '../../../constant';
import logger from '../../../common/logger';

export async function runShellCommand(command: string, showStdout?: boolean) {
  logger.debug(`runShellCommand command = ${command}`);
  return new Promise<void>((resolve, reject) => {
    const dProcess = spawn(command, { shell: true });

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
