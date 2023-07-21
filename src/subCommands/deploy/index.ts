import { parseArgv } from '@serverless-devs/utils';
import _ from 'lodash';

import Service from './impl/function';
import Trigger from './impl/trigger';
import logger from '../../logger';
import { verify } from '../../utils';
import { IInputs } from '../../interface';

export default class Deploy {
  readonly opts: Record<string, any>;

  readonly service?: Service;
  readonly trigger?: Trigger;

  constructor(inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      alias: {
        yes: 'y',
      },
      boolean: ['skip-push'],
    });

    // TODO: 更完善的验证
    verify(inputs.props);

    const { function: type, trigger, yes, 'skip-push': skipPush } = this.opts;
    logger.debug('parse argv:');
    logger.debug(this.opts);
    // 初始化部署实例
    const deployAll = !type && !trigger;
    logger.debug(`Deploy all resources: ${deployAll}`);
    if (deployAll || type) {
      this.service = new Service(inputs, { type, yes, skipPush });
    }
    if (deployAll || trigger) {
      this.trigger = new Trigger(inputs, { yes, trigger });
    }
  }

  async run() {
    // 调用前置
    // await this.service?.before();
    await this.trigger?.before();

    // 调用运行
    // await this.service?.run();
    await this.trigger?.run();
  }
}
