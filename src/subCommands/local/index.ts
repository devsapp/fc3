import { NodejsLocalInvoke } from './impl/invoke/nodejsLocalInvoke';
import { PythonLocalInvoke } from './impl/invoke/pythonLocalInvoke';
import { JavaLocalInvoke } from './impl/invoke/javaLocalInvoke';
import { PhpLocalInvoke } from './impl/invoke/phpLocalInvoke';
import { GoLocalInvoke } from './impl/invoke/goLocalInvoke';
import { DotnetLocalInvoke } from './impl/invoke/dotnetLocalInvoke';
import { CustomLocalInvoke } from './impl/invoke/customLocalInvoke';
import { CustomContainerLocalInvoke } from './impl/invoke/customContainerLocalInvoke';
import { CustomLocalStart } from './impl/start/customLocalStart';
import { CustomContainerLocalStart } from './impl/start/customContainerLocalStart';

import { IInputs } from '../../interface';
import logger from '../../logger';

import { NodejsLocalStart } from './impl/start/nodejsLocalStart';
import { PythonLocalStart } from './impl/start/pythonLocalStart';
import { PhpLocalStart } from './impl/start/phpLocalStart';
import { GoLocalStart } from './impl/start/goLocalInvoke';
import { DotnetLocalStart } from './impl/start/dotnetLocalStart';
import { JavaLocalStart } from './impl/start/javaLocalStart';

export default class ComponentLocal {
  /**
   * @param inputs
   * @returns
   */
  public async invoke(inputs: IInputs) {
    logger.debug(`invoke input: ${JSON.stringify(inputs.props)}`);

    // check if has http trigger; if has, advise use local start
    if (this.hasHttpTrigger(inputs.props.triggers)) {
      logger.warn(`The function has an HTTP trigger. You had better use ‘s local start‘ instead. `);
    }

    switch (inputs.props.runtime) {
      // case 'nodejs6':
      case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16':
      case 'nodejs18':
      case 'nodejs20': {
        const nodeLocalInvoker = new NodejsLocalInvoke(inputs);
        await nodeLocalInvoker.invoke();
        break;
      }
      // case 'python2.7':
      case 'python3':
      case 'python3.9':
      case 'python3.10':
      case 'python3.12': {
        const pythonLocalInvoker = new PythonLocalInvoke(inputs);
        await pythonLocalInvoker.invoke();
        break;
      }
      case 'java8':
      case 'java11': {
        const javaLocalInvoker = new JavaLocalInvoke(inputs);
        await javaLocalInvoker.invoke();
        break;
      }
      case 'php7.2': {
        const phpLocalInvoker = new PhpLocalInvoke(inputs);
        await phpLocalInvoker.invoke();
        break;
      }
      case 'go1': {
        const goLocalInvoke = new GoLocalInvoke(inputs);
        await goLocalInvoke.invoke();
        break;
      }
      case 'dotnetcore3.1': {
        const dotnetLocalInvoker = new DotnetLocalInvoke(inputs);
        await dotnetLocalInvoker.invoke();
        break;
      }
      case 'custom':
      case 'custom.debian10':
      case 'custom.debian11':
      case 'custom.debian12': {
        const customLocalInvoker = new CustomLocalInvoke(inputs);
        await customLocalInvoker.invoke();
        break;
      }
      case 'custom-container': {
        const customContainerLocalInvoker = new CustomContainerLocalInvoke(inputs);
        await customContainerLocalInvoker.invoke();
        break;
      }
      default:
        logger.error(
          `${inputs.props.runtime} is not supported. you can see the supported runtime list in https://help.aliyun.com/document_detail/2512952.html`,
        );
    }
    return {};
  }

  public async start(inputs: IInputs) {
    logger.debug(`start input: ${JSON.stringify(inputs.props)}`);

    // check if has http trigger; if not has, advise use local start
    if (!this.hasHttpTrigger(inputs.props.triggers)) {
      logger.error(
        'The function does not have an HTTP trigger and cannot use ‘s local start’. You should use ‘s local invoke’ instead.',
      );
      return {};
    }

    switch (inputs.props.runtime) {
      case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16':
      case 'nodejs18':
      case 'nodejs20': {
        const nodejsLocalStart = new NodejsLocalStart(inputs);
        await nodejsLocalStart.start();
        break;
      }
      case 'python3':
      case 'python3.9':
      case 'python3.10':
      case 'python3.12': {
        const pythonLocalStart = new PythonLocalStart(inputs);
        await pythonLocalStart.start();
        break;
      }
      case 'java8':
      case 'java11': {
        const javaLocalStart = new JavaLocalStart(inputs);
        await javaLocalStart.start();
        break;
      }
      case 'php7.2': {
        const pythonLocalStart = new PhpLocalStart(inputs);
        await pythonLocalStart.start();
        break;
      }
      case 'go1': {
        const goLocalStart = new GoLocalStart(inputs);
        await goLocalStart.start();
        break;
      }
      case 'dotnetcore3.1': {
        const dotnetLocalStart = new DotnetLocalStart(inputs);
        await dotnetLocalStart.start();
        break;
      }
      case 'custom':
      case 'custom.debian10':
      case 'custom.debian11':
      case 'custom.debian12': {
        const customLocalStart = new CustomLocalStart(inputs);
        await customLocalStart.start();
        break;
      }
      case 'custom-container': {
        const customContainerLocalStart = new CustomContainerLocalStart(inputs);
        await customContainerLocalStart.start();
        break;
      }
      // todo 新文档发布以后地址可能要改
      default:
        logger.error(
          `start command ${inputs.props.runtime} is not supported. you can see the supported runtime list in https://manual.serverless-devs.com/user-guide/aliyun/fc3/local/#_6`,
        );
    }
  }

  hasHttpTrigger(triggers: any): boolean {
    if (Array.isArray(triggers)) {
      for (const trigger of triggers) {
        if (trigger.triggerType === 'http') {
          return true;
        }
      }
    }
    return false;
  }
}
