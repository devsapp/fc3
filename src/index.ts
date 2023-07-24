import { parseArgv } from '@serverless-devs/utils';
import { IInputs, Runtime } from './interface';
import _ from 'lodash';

import Base from './base';
import logger from './logger';

import BuilderFactory, { BuildType } from './subCommands/build';
import Local from './subCommands/local';
import Deploy from './subCommands/deploy';
import Info from './subCommands/info';
import Plan from './subCommands/plan';
import Invoke from './subCommands/invoke';
import Remove from './subCommands/remove';
import Sync from './subCommands/sync';

export default class Fc extends Base {
  // 部署函数
  public async deploy(inputs: IInputs) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    await super.handlePreRun(inputs, true);
    const deploy = new Deploy(inputs);
    await deploy.run();
    return 'deploy end';
  }

  public async info(inputs: IInputs) {
    await super.handlePreRun(inputs, true);

    const info = new Info(inputs);
    const result = await info.run();
    logger.debug(`Get info: ${JSON.stringify(result)}`);

    return result;
  }

  public async plan(inputs: IInputs) {
    await super.handlePreRun(inputs, true);

    const plan = new Plan(inputs);
    const result = await plan.run();
    logger.debug(`plan result: ${JSON.stringify(result)}`);

    return result;
  }

  public async invoke(inputs: IInputs) {
    await super.handlePreRun(inputs, true);
    const invoke = new Invoke(inputs);
    return await invoke.run();
  }

  public async sync(inputs: IInputs) {
    await super.handlePreRun(inputs, true);
    const sync = new Sync(inputs);
    return await sync.run();
  }

  public async remove(inputs: IInputs) {
    await super.handlePreRun(inputs, true);
    const remove = new Remove(inputs);
    return await remove.run();
  }

  public async build(inputs: IInputs) {
    await super.handlePreRun(inputs, false);

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
    await super.handlePreRun(inputs, false);

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
