import { spawn, StdioOptions } from 'child_process';
import logger from '../logger';

enum COMMAND_STDIO {
  inherit = 'inherit',
  append = 'append',
  return = 'return'
  // null = 'null',
}

async function runCommand(
  command: string,
  showStdout: COMMAND_STDIO,
  shellScript?: string,
  cwd?: string,
) {
  logger.debug(`runCommand command = ${command} ${shellScript || ''}`);
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

  if(showStdout !== COMMAND_STDIO.return){
    console.log(''); // 独立出来一个空行，是日志看起来有一点结构行
  }

  const isInherit = showStdout === COMMAND_STDIO.inherit;
  return new Promise<any>((resolve, reject) => {
    const options = {
      shell: true,
      stdio: (isInherit ? 'inherit' : 'pipe') as StdioOptions,
      cwd,
    };
    const dProcess = spawn(cmd, args, options);

    let result = '';

    if (!isInherit) {
      dProcess.stdout.on('data', (data) => {
        if (showStdout === COMMAND_STDIO.append) {
          logger.append(data.toString());
        }
        if(showStdout === COMMAND_STDIO.return){
          result = data.toString();
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
      if(showStdout !== COMMAND_STDIO.return){
        console.log(''); // 独立出来一个空行，是日志看起来有一点结构行
      }
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(`command failed with code ${code}`));
      }
    });
  });
}

runCommand.showStdout = COMMAND_STDIO;

export default runCommand;
