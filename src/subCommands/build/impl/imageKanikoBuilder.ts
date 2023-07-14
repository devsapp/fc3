import path from 'path';
import { Builder } from './baseBuilder';
import { runCommand } from './docker/runCommand';
import logger from '../../../logger';

export class ImageKanikoBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageKanikoBuilder building ... ${JSON.stringify(this.inputProps)}`);
    await this.mockDockerLogin();

    // TODO: parse dockerfile and context from args
    const dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    const context = this.getCodeUri();

    let cmdStr = `executor --force=true --cache=false --use-new-run=true --dockerfile ${dockerFile} --context ${context} --destination ${this.getRuntimeBuildImage()}`;

    await runCommand(cmdStr, undefined, true);
  }
}
