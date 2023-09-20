import path from 'path';
import { Builder } from './baseBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';
import { parseArgv } from '@serverless-devs/utils';
import { IInputs } from '../../../interface';

export class ImageDockerBuilder extends Builder {
  private opts: any;
  constructor(readonly inputs: IInputs) {
    super(inputs);
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', dockerfile: 'f' },
      boolean: ['help'],
      string: ['dockerfile', 'context'],
    });
    this.opts = opts;
    logger.debug(`ImageDockerBuilder opts: ${JSON.stringify(opts)}`);
  }
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputs)}`);

    let dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    let context = this.getCodeUri();

    if (this.opts['dockerfile']) {
      dockerFile = this.opts['dockerfile'];
      dockerFile = path.isAbsolute(dockerFile) ? dockerFile : path.join(this.baseDir, dockerFile);
      context = path.dirname(dockerFile);
    }
    if (this.opts['context']) {
      context = this.opts['context'];
      context = path.isAbsolute(context) ? context : path.join(this.baseDir, context);
    }
    const image = await this.getRuntimeBuildImage();
    let dockerCmdStr = `DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -t ${image} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
  }
}
