import { IInputs } from '@serverless-devs/component-interface';
import { parseArgv } from '@serverless-devs/utils';
import _ from 'lodash';

import Service from './impl/function';
import logger from '../../common/logger';
import { verify } from '../../utils';

export default class Deploy {
  readonly opts: Record<string, any>;

  readonly service?: Service;
  readonly trigger?: any;

  constructor(private inputs: IInputs) {
    this.opts = parseArgv(inputs.args, {
      boolean: ['y', 'skip-push'],
    });

    verify(inputs.props);

    const {
      function: type,
      trigger,
    } = this.opts;

    const deployAll = !type && !trigger;
    logger.debug(`Deploy all resources: ${deployAll}`);

    if (deployAll || type) {
      this.service = new Service(type, inputs.props.function);
    }
    if (deployAll || trigger) {
      this.trigger = '';
    }

    logger.info(this.opts);
  }

  async run() {
    logger.debug(this.inputs);
  }
}
