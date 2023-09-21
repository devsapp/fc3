import { ImageBuilder } from './baseImageBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';

export class ImageKanikoBuilder extends ImageBuilder {
  async runBuild() {
    logger.debug(`ImageKanikoBuilder building ... ${JSON.stringify(this.inputs)}`);
    await this.mockDockerLogin();

    const { dockerFile, context } = this.getBuildContext();
    const image = await this.getRuntimeBuildImage();
    let cmdStr = `executor --force=true --cache=false --use-new-run=true --dockerfile ${dockerFile} --context ${context} --destination ${image}`;

    await runCommand(cmdStr, runCommand.showStdout.inherit);
  }
}
