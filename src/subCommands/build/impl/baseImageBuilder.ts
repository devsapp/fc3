import path from 'path';
import { Builder } from './baseBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';
import { parseArgv } from '@serverless-devs/utils';
import { IInputs } from '../../../interface';

export class ImageBuilder extends Builder {
  protected opts: any;
  constructor(readonly inputs: IInputs) {
    super(inputs);
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', dockerfile: 'f' },
      boolean: ['help'],
      string: ['dockerfile', 'context'],
    });
    this.opts = opts;
    logger.debug(`ImageBuilder opts: ${JSON.stringify(opts)}`);
  }

  protected getBuildContext(): any {
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
    return { dockerFile, context };
  }
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputs)}`);
    const { dockerFile, context } = this.getBuildContext();
    const image = await this.getRuntimeBuildImage();
    let dockerCmdStr = `docker build --platform linux/amd64 -t ${image} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
  }
}
