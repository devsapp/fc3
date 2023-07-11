import Base from "./base";
import logger from './logger';

import BuilderFactory, { BuildType } from './subCommands/build';

export default class Fc extends Base {
  deploy(inputs: any) {
    logger.info('Deploy');
  }

  /**
   * @param inputs
   * @returns
   */
  public async build(inputs: any) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    logger.info('command build');
    if (inputs.props.runtime === 'custom-container') {
      let dockerBuilder = BuilderFactory.getBuilder(BuildType.ImageDocker, inputs);
      dockerBuilder.build();
    } else {
      let defaultBuilder = BuilderFactory.getBuilder(BuildType.Default, inputs);
      defaultBuilder.build();
    }
    return {};
  }
}
