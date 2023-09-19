import { Builder } from './baseBuilder';
import logger from '../../../logger';

export class ImageBuiltKitBuilder extends Builder {
  async runBuild() {
    logger.debug(`ImageBuiltKitBuilder building ... ${JSON.stringify(this.inputs)}`);
    await this.mockDockerLogin();

    // TODO
  }
}
