import _ from 'lodash';
import assert from 'assert';
import { IInputs } from '@serverless-devs/component-interface';
import { IProps, RegionList, RuntimeList } from '../interface';
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

  // 验证入参
  checkProps(props: IProps) {
    const region = _.get(props, 'region');
    assert.ok(RegionList.includes(region), `Region not support ${region}`);

    const runtime = _.get(props, 'function.runtime');
    assert.ok(RuntimeList.includes(runtime), `Runtime not support ${region}`);

    const functionName = _.get(props, 'function.functionName');
    assert(functionName, `FunctionName cannot be empty`);
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
