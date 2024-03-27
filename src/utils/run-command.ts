import { spawn, StdioOptions } from 'child_process';
import logger from '../logger';

enum COMMAND_STDIO {
  inherit = 'inherit',
  pipe = 'pipe',
  ignore = 'ignore',
}

async function runCommand(
  command: string,
  showStdout: COMMAND_STDIO,
  shellScript?: string,
  cwd?: string,
) {
  logger.info(`runCommand ===>  \n${command} ${shellScript || ''}`);
  const [cmdStr, ...args] = command.split(' ');
  let cmd = cmdStr;
  if (cmd.includes('=') && args.length > 0) {
    const c = args.shift();
    cmd = `${cmd} ${c}`;
  }
  logger.debug(`runCommand cmd = ${cmd}`);

  if (shellScript) {
    args.push(shellScript);
    // args.push(...shellScript.split(' '));
  }
  logger.debug(`runCommand args = ${JSON.stringify(args)}`);

  console.log(''); // 独立出来一个空行，是日志看起来有一点结构行

  return new Promise<void>((resolve, reject) => {
    const options = {
      shell: true,
      stdio: showStdout as StdioOptions,
      cwd,
    };
    const dProcess = spawn(cmd, args, options);

    if (showStdout === COMMAND_STDIO.pipe) {
      dProcess.stdout.on('data', (data) => {
        if (showStdout === COMMAND_STDIO.pipe) {
          logger.append(data.toString());
        }
      });

      dProcess.stderr.on('data', (data) => {
        const warnErrorMsg = data.toString();
        if (showStdout === COMMAND_STDIO.pipe) {
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
