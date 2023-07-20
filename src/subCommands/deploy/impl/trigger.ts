import _ from 'lodash';
import { IInputs, ITrigger } from '../../../interface';
import logger from '../../../logger';
import Base from './base';

interface IOpts {
  yes: boolean | undefined;
  trigger: boolean | string | undefined;
}

export default class Trigger extends Base {
  local: ITrigger[] = [];

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);

    const local = _.cloneDeep(_.get(inputs, 'props.triggers', []));
    const triggerNames = local.map((item) => item.triggerName);

    // 如果指定了 trigger 为字符串，则认为指定了 trigger name
    if (_.isString(opts.trigger) && opts.trigger !== '') {
      const onlyDeployTrigger = opts.trigger.split(',');
      // 判断指定的配置是否存在参数中
      const difference = _.difference(triggerNames, onlyDeployTrigger);
      if (_.isEmpty(difference)) {
        logger.error(`Trigger names ${difference} are not allowed in trigger config`);
      }

      // 仅保留yaml中配置的参数
      const intersection = _.intersection(triggerNames, onlyDeployTrigger);
      logger.debug(`need deploy trigger names: ${intersection}`);
      this.local = _.filter(local, (item) => intersection.includes(item.triggerName));
    } else {
      this.local = local;
    }

    logger.debug(`need deploy trigger: ${JSON.stringify(this.local)}`);
  }

  async before() {
    // await this.getRemote();
  }

  async run() {}
}
