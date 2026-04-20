import { RunitInput } from './interface';
import logger from '../../logger';
import _ from 'lodash';
import { RunItClient, packFolder, type AcrInfo } from '@runit/sdk';
import path from 'path';
import { sleep } from '../../utils';
// import { getDockerTmpUser } from '../../resources/acr';
// import { IRegion } from '../../interface';
import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/runit';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Runit {
  readonly subCommand: string;
  client: RunItClient;
  private baseDir: string;
  inputs: RunitInput;

  constructor(inputs: RunitInput) {
    this.baseDir = inputs.baseDir || process.cwd();
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help'],
      string: [],
    });
    const { _: subCommands } = opts;
    logger.debug(`subCommands: ${JSON.stringify(subCommands, null, 2)}`);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 runit -h" to query how to use the command`,
      );
    }
    this.subCommand = subCommand;
    this.inputs = inputs;
  }

  async deploy() {
      const {
        registry,
        image,
        tag,
        command,
        port,
        username,
        password,
        environmentVariables
      } = this.inputs.props.runtime;
      const {
        code: codeUri,
        buildSpec,
        exclude,
        setup,
      } = this.inputs.props.build;

      // const credential = await this.inputs.getCredential();
      // 获取acr信息
      // const { dockerTmpUser, dockerTmpToken } = await getDockerTmpUser(this.inputs.props.region as IRegion, credential, '');

      // logger.debug(`dockerTmpUser: ${dockerTmpUser} dockerTmpToken: ${dockerTmpToken}`);

      const acrInfo: AcrInfo = {
        registry,
        image,
        tag: tag || `basic-${Date.now()}`,
        // username: dockerTmpUser,
        // password: dockerTmpToken,
        username,
        password
      }

      await this.initClient(this.inputs);
      let workerId = "";

      try {
        const filePath = path.isAbsolute(codeUri) ? codeUri : path.join(this.baseDir, codeUri)
        const tarPath = packFolder(filePath);

        workerId = await this.client.createWorker(buildSpec);
        logger.debug(`Worker ready: ${workerId}\n`);

        await this.client.uploadCode(workerId, tarPath, acrInfo, exclude);
        logger.debug("Code uploaded.\n");

        const taskId = await this.client.createTask(workerId, setup);
        logger.debug(`Task: ${taskId}\n`);

        let fullStdout = "";
        let fullStderr = "";
        while (true) {
          const task = await this.client.getTask(workerId, taskId);
          fullStdout = task.stdout;
          fullStderr = task.stderr;

          logger.info(`Task status: ${task.status}\n exitCode=${task.exitCode}`);

          if (task.status === "COMPLETED" || task.status === "FAILED") {
            if (task.status === "FAILED" || task.exitCode !== 0) {
              logger.error(`Task failed: stdout=${fullStdout} stderr=${fullStderr}`);
              throw new Error(`Task failed: status=${task.status} exitCode=${task.exitCode}`);
            }
            break;
          }
          await sleep(5);
        }

        const combinedOutput = fullStdout + "\n" + fullStderr;
        const imageRef = this.extractImageRef(combinedOutput);
        if (!imageRef) {
          logger.error(this.stripAnsi(combinedOutput).slice(-2000));
          throw new Error("Could not extract image ref from task output");
        }
        logger.debug(`Built image: ${imageRef}\n`);

        await this.client.createAppFunction({
          imageRef,
          command: command,
          port,
          envVars: environmentVariables
        });


      } finally {
        if (workerId) {
          try {
            logger.debug(`Deleting worker: ${workerId}\n`);
            await this.client.deleteWorker(workerId);
          } catch (e) {
            logger.warn("cleanup worker failed:", e);
          }
        }
      }
    }

  async remove() { }

  async initClient(inputs: RunitInput) {
      const {
        AccountID: accountId,
        AccessKeyID: accessKeyId,
        AccessKeySecret: accessKeySecret,
      } = await inputs.getCredential();

      this.client = new RunItClient({
        ak: accessKeyId!,
        sk: accessKeySecret!,
        uid: accountId!,
        region: inputs.props.region,
      });
    }

    stripAnsi(s: string): string {
      return s.replace(/\x1b\[[0-9;]*m/g, "");
    }

    extractImageRef(output: string): string | null {
      const plain = this.stripAnsi(output);
      const m = plain.match(/execute-commit-push completed\s+ref=(\S+)/);
      return m ? m[1] : null;
    }
  }