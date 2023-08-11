import { parseArgv } from '@serverless-devs/utils';
import _ from 'lodash';

import Service from './impl/function';
import Trigger from './impl/trigger';
import logger from '../../logger';
import { verify } from '../../utils';
import { IInputs } from '../../interface';
import Domain from './impl/domain';

export default class Deploy {
  readonly opts: Record<string, any>;

  readonly service?: Service;
  readonly trigger?: Trigger;
  readonly domain?: Domain;

  constructor(inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      alias: {
        yes: 'y',
      },
      boolean: ['skip-push'],
    });

    // TODO: 更完善的验证
    verify(inputs.props);

    const { domain, function: type, trigger, yes, 'skip-push': skipPush } = this.opts;
    logger.debug('parse argv:');
    logger.debug(this.opts);
    // 初始化部署实例
    const deployAll = !type && !trigger && !domain;
    logger.debug(`Deploy all resources: ${deployAll}`);
    if (deployAll || type) {
      this.service = new Service(inputs, { type, yes, skipPush }); // function
    }
    if (deployAll || trigger) {
      this.trigger = new Trigger(inputs, { yes, trigger });
    }
    if (deployAll || domain) {
      this.domain = new Domain(inputs, { yes, domain });
    }
  }

  async run() {
    // 调用前置
    await this.service?.before();
    await this.trigger?.before();
    //await this.domain?.before();

    // 调用运行
    await this.service?.run();
    await this.trigger?.run();
    //await this.domain?.run();
  }
}
