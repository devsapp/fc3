import { parseArgv } from '@serverless-devs/utils';
import _ from 'lodash';

import Service from './impl/function';
import Trigger from './impl/trigger';
import AsyncInvokeConfig from './impl/async_invoke_config';
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

  constructor(readonly inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      alias: {
        'assume-yes': 'y',
      },
      boolean: ['skip-push'],
    });

    // TODO: 更完善的验证
    verify(inputs.props);

    const { function: type, trigger, 'assume-yes': yes, 'skip-push': skipPush } = this.opts;
    logger.debug('parse argv:');
    logger.debug(this.opts);
    // 初始化部署实例
    const deployAll = !type && !trigger;
    logger.debug(`Deploy all resources: ${deployAll}`);
    if (deployAll || type) {
      this.service = new Service(inputs, { type, yes, skipPush }); // function
    }
    if (deployAll || trigger) {
      this.trigger = new Trigger(inputs, { yes, trigger });
    }
    if (deployAll) {
      this.asyncInvokeConfig = new AsyncInvokeConfig(inputs, { yes });
    }
  }

  async run() {
    // 调用前置
    await this.service?.before();
    await this.trigger?.before();
    await this.asyncInvokeConfig?.before();

    // 调用运行
    await this.service?.run();
    await this.trigger?.run();
    await this.asyncInvokeConfig?.run();

    // 获取输出
    const info = new Info(this.inputs);
    info.setGetApiType(GetApiType.simpleUnsupported);
    const result = await info.run();
    logger.debug(`Get info: ${JSON.stringify(result)}`);
    return result;
  }
}
