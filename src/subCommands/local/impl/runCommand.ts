import { spawn } from 'child_process';
import { isDebug } from '../../../constant';
import logger from '../../../logger';

export async function runShellCommand(command: string, showStdout?: boolean) {
  logger.debug(`runShellCommand command = ${command}`);
  // TODO: 拉取镜像存在问题，导致日志可能爆多
  return await new Promise<void>((resolve, reject) => {
    const dProcess = spawn(command, {
      shell: true,
    });

    dProcess.stdout.on('data', (data) => {
      if (isDebug || showStdout) {
        logger.append(data.toString());
      }
    });

    dProcess.stderr.on('data', (data) => {
      const warnErrrMsg = data.toString();
      logger.append(warnErrrMsg);
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
