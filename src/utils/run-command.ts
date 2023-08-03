import { spawn, StdioOptions } from 'child_process';
import logger from '../logger';

enum COMMAND_STDIO {
  inherit = 'inherit',
  append = 'append',
  // null = 'null',
}

async function runCommand(command: string, showStdout: COMMAND_STDIO, shellScript?: string) {
  logger.debug(`runCommand command = ${command}`);
  const [cmd, ...args] = command.split(' ');
  logger.debug(`runCommand cmd = ${cmd}`);
  if (shellScript) {
    args.push(shellScript);
  }
  logger.debug(`runCommand args = ${args}`);

  console.log(''); // 独立出来一个空行，是日志看起来有一点结构行

  const isInherit = showStdout === COMMAND_STDIO.inherit;
  return new Promise<void>((resolve, reject) => {
    const options = {
      shell: true,
      stdio: (isInherit ? 'inherit' : 'pipe') as StdioOptions,
    };
    const dProcess = spawn(cmd, args, options);

    if (!isInherit) {
      dProcess.stdout.on('data', (data) => {
        if (showStdout === COMMAND_STDIO.append) {
          logger.append(data.toString());
        }
      });

      dProcess.stderr.on('data', (data) => {
        const warnErrorMsg = data.toString();
        if (showStdout === COMMAND_STDIO.append) {
          logger.append(warnErrorMsg);
        }
      });
    }

    dProcess.on('close', (code) => {
      console.log(''); // 独立出来一个空行，是日志看起来有一点结构行
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`command failed with code ${code}`));
      }
    });
  });
}

runCommand.showStdout = COMMAND_STDIO;

export default runCommand;
