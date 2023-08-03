import path from 'path';
import { Builder } from './baseBuilder';
import logger from '../../../logger';
import { runCommand } from '../../../utils';
import { getDockerTmpUser } from '../../../resources/acr';

export class ImageDockerBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputProps)}`);

    // TODO: parse dockerfile and context from args
    const dockerFile = path.join(this.getCodeUri(), 'Dockerfile');
    const context = this.getCodeUri();

    const image = await this.getRuntimeBuildImage();
    let dockerCmdStr = `docker build -t ${image} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

    const credential = await this.getCredentials();
    let dockerTmpConfig = await getDockerTmpUser(
      this.getRegion(),
      credential,
      this.getAcrEEInstanceID(),
    );
    dockerCmdStr = `docker login ${image} --username=${dockerTmpConfig.dockerTmpUser} --password ${dockerTmpConfig.dockerTmpToken}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

    dockerCmdStr = `docker push ${image}`;
    await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
  }
}
