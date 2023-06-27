import logger from './common/logger';
import { InputProps } from './impl/interface';
import { BuilderFactory } from './impl/builderFactory';
import { BuildType } from './impl/enum';

export default class ComponentBuild {
  /**
   * @param inputs
   * @returns
   */
  public async build(inputs: InputProps) {
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
