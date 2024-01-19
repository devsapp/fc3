import { ImageBuilder } from './baseImageBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';
import path from 'path';

export class ImageBuiltKitBuilder extends ImageBuilder {
  buildKitServerAddr = process.env.buildkitServerAddr || 'localhost';
  buildKitServerPort = process.env.buildkitServerPort || 65360;
  async runBuild() {
    logger.debug(`ImageBuiltKitBuilder building ... ${JSON.stringify(this.inputs)}`);
    await this.mockDockerLogin();

    const { dockerFileName, context } = this.getBuildContext();
    const image = await this.getRuntimeBuildImage();

    let buildCmdStr = `buildctl --addr tcp://${this.buildKitServerAddr}:${this.buildKitServerPort} build --no-cache --frontend dockerfile.v0 --local context=${context} --local dockerfile=${context} --opt filename=${dockerFileName} --output type=image,name=${image},push=true`;
    await runCommand(buildCmdStr, runCommand.showStdout.inherit);
  }

  protected getBuildContext(): any {
    let dockerFileName = 'Dockerfile';
    let dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    let context = this.getCodeUri();

    if (this.opts['dockerfile']) {
      dockerFile = this.opts['dockerfile'];
      dockerFile = path.isAbsolute(dockerFile) ? dockerFile : path.join(this.baseDir, dockerFile);
      context = path.dirname(dockerFile);
      dockerFileName = path.basename(dockerFile);
    }
    if (this.opts['context']) {
      context = this.opts['context'];
      context = path.isAbsolute(context) ? context : path.join(this.baseDir, context);
    }
    return { dockerFileName, context };
  }
}
