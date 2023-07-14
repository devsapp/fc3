import { IInputs } from '@serverless-devs/component-interface';
import { parseArgv } from '@serverless-devs/utils';
import _ from 'lodash';

import Service from './impl/function';
import logger from '../../logger';
import { verify } from '../../utils';

export default class Deploy {
  readonly opts: Record<string, any>;

  readonly service?: Service;
  readonly trigger?: any;

  constructor(inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      boolean: ['y', 'skip-push'],
    });

    // TODO: 更完善的验证
    verify(inputs.props);

    const { function: type, trigger } = this.opts;
    // 初始化部署实例
    const deployAll = !type && !trigger;
    logger.debug(`Deploy all resources: ${deployAll}`);
    if (deployAll || type) {
      this.service = new Service(inputs, type);
    }
    if (deployAll || trigger) {
      this.trigger = '';
    }
  }

  async run() {
    await this.service?.preRun();
  }
}
