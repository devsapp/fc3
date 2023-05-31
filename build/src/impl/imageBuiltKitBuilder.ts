import { Builder } from './baseBuilder';
import logger from '../common/logger';

export class ImageBuiltKitBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageBuiltKitBuilder building ... ${JSON.stringify(this.inputProps)}`);
    await this.mockDockerLogin();

    // TODO
  }
}