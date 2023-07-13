import { parseArgv } from '@serverless-devs/utils';
import { IInputs, Runtime } from './interface';
import _ from 'lodash';

import Base from './common/base';
import logger from './common/logger';

import BuilderFactory, { BuildType } from './subCommands/build';
import Local from './subCommands/local';
import Deploy from './subCommands/deploy';

export default class Fc extends Base {
  // 部署函数
  public async deploy(inputs: IInputs) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    await super.handlePreRun(inputs);

    const deploy = new Deploy(inputs);
    return await deploy.run();
  }

  public async build(inputs: IInputs) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    await super.handlePreRun(inputs);

    const runtime = _.get(inputs, 'props.function.runtime');
    if (runtime === Runtime['custom-container']) {
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
    await super.handlePreRun(inputs);

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
