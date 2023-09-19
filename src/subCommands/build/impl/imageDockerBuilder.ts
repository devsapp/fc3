import path from 'path';
import { Builder } from './baseBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';

export class ImageDockerBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputs)}`);

    // TODO: parse dockerfile and context from args
    const dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    const context = this.getCodeUri();

    const image = await this.getRuntimeBuildImage();
    let dockerCmdStr = `DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -t ${image} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
  }
}
