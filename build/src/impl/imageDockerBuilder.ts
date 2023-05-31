import { Builder } from './baseBuilder';
import logger from '../common/logger';
import { runCommand } from "./docker/runCommand";
import path from 'path';
import { getDockerTmpUser } from './docker/acr-login'

export class ImageDockerBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageDockerBuilder building ... ${JSON.stringify(this.inputProps)}`);

    // TODO: parse dockerfile and context from args
    const dockerFile = path.join(this.getCodeUri(), "Dockerfile");
    const context = this.getCodeUri();

    let dockerCmdStr = `docker build -t ${this.getRuntimeBuildImage()} -f ${dockerFile} ${context}`;
    await runCommand(dockerCmdStr, undefined, true);

    let dockerTmpConfig = await getDockerTmpUser(this.getRegion(), this.getCredentials(), this.getAcrEEInstanceID());
    dockerCmdStr = `docker login ${this.getRuntimeBuildImage()} --username=${dockerTmpConfig.dockerTmpUser} --password ${dockerTmpConfig.dockerTmpToken}`;
    await runCommand(dockerCmdStr);

    dockerCmdStr = `docker push ${this.getRuntimeBuildImage()}`;
    await runCommand(dockerCmdStr, undefined, true);
  }
}