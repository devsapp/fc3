import _ from 'lodash';
import { IInputs } from '@serverless-devs/component-interface';
import Logger from './logger';

export default class Base {
  commands: any;

  constructor({ logger }: any) {
    Logger._set(logger);

    this.commands = {
      deploy: {
        help: {
          description: 'deploy command',
          summary: '',
          option: [
            ['--no-enable', 'whether to no enable proxy'],
            ['--abc', 'xxxx'],
          ],
        },
        subCommands: {
          service: {},
          function: {},
        },
      },
      remove: {},
    };
  }

  // 在运行方法之前运行
  async handlePreRun(inputs: IInputs) {
    // fc组件镜像 trim 左右空格
    const image = _.get(inputs, 'props.function.customContainerConfig.image');
    if (!_.isEmpty(image)) {
      _.set(inputs, 'props.function.customContainerConfig.image', _.trim(image));
    }
  }
}
