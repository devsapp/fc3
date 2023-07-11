import { parseArgv } from '@serverless-devs/utils';
import { IInputs } from '@serverless-devs/component-interface';
import _ from 'lodash';

import Base from "./common/base";
import logger from './common/logger';

import BuilderFactory, { BuildType } from './subCommands/build';
import Local from './subCommands/local';

export default class Fc extends Base {
  deploy(inputs: IInputs) {
    logger.info('Deploy');
  }

  public async build(inputs: IInputs) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    if (inputs.props.runtime === 'custom-container') {
      let dockerBuilder = BuilderFactory.getBuilder(BuildType.ImageDocker, inputs);
      await dockerBuilder.build();
    } else {
      let defaultBuilder = BuilderFactory.getBuilder(BuildType.Default, inputs);
      await defaultBuilder.build();
    }
    return {};
  }

  public async local(inputs: IInputs) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);

    const { _: command } = parseArgv(inputs.args);
    const subCommand = _.get(command, '[0]');
    if (!subCommand) {
      throw new Error("Please use 's local -h', need specify subcommand");
    }

    const local = new Local();
    if (subCommand === 'start') {
      return await local.start(inputs);
    } else if (subCommand === 'invoke') {
      return await local.start(inputs);
    }
    throw new Error("Please use 's local start -h' or 's local invoke -h'");
  }
}
