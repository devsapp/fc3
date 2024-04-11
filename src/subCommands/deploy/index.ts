import { parseArgv } from '@serverless-devs/utils';

import Service from './impl/function';
import Trigger from './impl/trigger';
import AsyncInvokeConfig from './impl/async_invoke_config';
import VpcBinding from './impl/vpc_binding';
import logger from '../../logger';
import { verify } from '../../utils';
import { IInputs } from '../../interface';
import Info from '../info/index';
import { GetApiType } from '../../resources/fc';

export default class Deploy {
  readonly opts: Record<string, any>;

  readonly service?: Service;
  readonly trigger?: Trigger;
  readonly asyncInvokeConfig?: AsyncInvokeConfig;
  readonly vpcBinding?: VpcBinding;

  constructor(readonly inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['skip-push', 'async_invoke_config'],
    });

    // TODO: 更完善的验证
    verify(inputs.props);

    const {
      function: type,
      trigger,
      'async-invoke-config': async_invoke_config,
      'assume-yes': yes,
      'skip-push': skipPush,
    } = this.opts;
    logger.debug('parse argv:');
    logger.debug(this.opts);
    // 初始化部署实例
    const deployAll = !type && !trigger && !async_invoke_config;
    logger.debug(`Deploy all resources: ${deployAll}`);
    if (deployAll || type) {
      this.service = new Service(inputs, { type, yes, skipPush }); // function
    }
    if (deployAll || trigger) {
      this.trigger = new Trigger(inputs, { yes, trigger });
    }
    if (deployAll || async_invoke_config) {
      this.asyncInvokeConfig = new AsyncInvokeConfig(inputs, { yes });
    }
    if (deployAll) {
      this.vpcBinding = new VpcBinding(inputs, { yes });
    }
  }

  async run() {
    // 调用前置
    await this.service?.before();
    await this.trigger?.before();
    await this.asyncInvokeConfig?.before();
    await this.vpcBinding?.before();

    // 调用运行
    const run1 = await this.service?.run();
    const run2 = await this.trigger?.run();
    const run3 = await this.asyncInvokeConfig?.run();
    const run4 = await this.vpcBinding?.run();

    // 获取输出
    if (run1 && run2 && run3 && run4) {
      const info = new Info(this.inputs);
      info.setGetApiType(GetApiType.simpleUnsupported);
      const result = await info.run();
      logger.debug(`Get info: ${JSON.stringify(result)}`);
      return result;
    }
  }
}
