import { ImageBuilder } from './baseImageBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';

export class ImageDockerBuilder extends ImageBuilder {
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputs)}`);
    const { dockerFile, context } = this.getBuildContext();
    const image = await this.getRuntimeBuildImage();
    let dockerCmdStr = `DOCKER_BUILDKIT=0 docker build --platform linux/amd64 -t ${image} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
  }
}
