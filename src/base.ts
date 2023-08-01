import _ from 'lodash';
import { IInputs } from './interface';
import Logger from './logger';
import logger from './logger';
import Role from './resources/ram';
import { isAuto } from './utils';
import { FUNCTION_CUSTOM_DEFAULT_CONFIG, FUNCTION_DEFAULT_CONFIG } from './default/config';
import path from 'path';
import FC from './resources/fc';
import { ICredentials } from '@serverless-devs/component-interface';

export default class Base {
  commands: any;

  constructor({ logger }: any) {
    Logger._set(logger);

    this.commands = {
      deploy: {
        help: {
          description: 'deploy command',
          // summary: '',
          option: [
            ['-y, --yes', 'Configuring deployment using yaml'],
            ['--skip-push', 'Skip Mirror Push'],
            [
              "--function ['code'/'config']",
              "Deploy function only; Use 'code' to deploy function code only, use 'config' to deploy function configuration only",
            ],
            [
              '--trigger [triggerName]',
              "Deploy trigger only; Specify a trigger name to deploy only the specified triggerName; Multiple names can be used ',' split",
            ],
          ],
        },
      },
      remove: {
        help: {
          description: 'remove command',
        },
      },
      info: {
        help: {
          description: 'info command',
        },
      },
      sync: {
        help: {
          description: 'sync command',
        },
      },
      invoke: {
        help: {
          description: 'sync command',
          option: [
            ['--payload', 'Call function parameter payload'],
            ['--event-file', 'Call function parameter file'],
          ],
        },
      },
    };
  }

  // 在运行方法之前运行
  async handlePreRun(inputs: IInputs, needCredential: boolean) {
    logger.debug(`input: ${JSON.stringify(inputs)}`);
    // fc组件镜像 trim 左右空格
    const image = _.get(inputs, 'props.function.customContainerConfig.image');
    if (!_.isEmpty(image)) {
      _.set(inputs, 'props.function.customContainerConfig.image', _.trim(image));
    }

    const role = _.get(inputs, 'props.function.role');
    const needHandleRole =
      _.isString(role) && role !== '' && !isAuto(role) && !Role.isRoleArnFormat(role);
    if (needCredential || needHandleRole) {
      inputs.credential = await inputs.getCredential();
    }

    inputs.baseDir = path.dirname(inputs.yaml.path || process.cwd());
    logger.debug(`baseDir is: ${inputs.baseDir}`);

    // 兼容只写 rule 的情况
    if (needHandleRole) {
      const arn = Role.completionArn(role, (inputs.credential as ICredentials).AccountID);
      _.set(inputs, 'props.function.role', arn);
    }

    if (!_.isEmpty(inputs.props.function)) {
      if (
        FC.isCustomContainerRuntime(inputs.props.function.runtime) ||
        FC.isCustomRuntime(inputs.props.function.runtime)
      ) {
        inputs.props.function = _.defaults(inputs.props.function, FUNCTION_CUSTOM_DEFAULT_CONFIG);
      } else {
        inputs.props.function = _.defaults(inputs.props.function, FUNCTION_DEFAULT_CONFIG);
      }
    }

    logger.debug(`handle pre run config: ${JSON.stringify(inputs.props)}`);
  }
}
