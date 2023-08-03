import path from 'path';
import { Builder } from './baseBuilder';
import { runCommand } from '../../../utils';
import logger from '../../../logger';

export class ImageKanikoBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageKanikoBuilder building ... ${JSON.stringify(this.inputProps)}`);
    await this.mockDockerLogin();

    // TODO: parse dockerfile and context from args
    const dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    const context = this.getCodeUri();

    const image = await this.getRuntimeBuildImage();
    let cmdStr = `executor --force=true --cache=false --use-new-run=true --dockerfile ${dockerFile} --context ${context} --destination ${image}`;

    await runCommand(cmdStr, runCommand.showStdout.inherit);
  }
}
