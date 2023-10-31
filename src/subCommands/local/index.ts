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

export default class ComponentBuild {
  /**
   * @param inputs
   * @returns
   */
  public async invoke(inputs: IInputs) {
    logger.debug(`invoke input: ${JSON.stringify(inputs.props)}`);

    switch (inputs.props.runtime) {
      // case 'nodejs6':
      // case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16': {
        const nodeLocalInvoker = new NodejsLocalInvoke(inputs);
        await nodeLocalInvoker.invoke();
        break;
      }
      case 'python2.7':
      case 'python3':
      case 'python3.9':
      case 'python3.10': {
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
      case 'dotnetcore2.1': {
        const dotnetLocalInvoker = new DotnetLocalInvoke(inputs);
        await dotnetLocalInvoker.invoke();
        break;
      }
      case 'custom':
      case 'custom.debian10': {
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
        logger.error(`${inputs.props.runtime} is not supported`);
    }
    return {};
  }

  public async start(inputs: IInputs) {
    logger.debug(`start input: ${JSON.stringify(inputs.props)}`);

    switch (inputs.props.runtime) {
      case 'custom':
      case 'custom.debian10': {
        const customLocalInvoker = new CustomLocalStart(inputs);
        await customLocalInvoker.start();
        break;
      }
      case 'custom-container': {
        const customContainerLocalInvoker = new CustomContainerLocalStart(inputs);
        await customContainerLocalInvoker.start();
        break;
      }
      default:
        logger.error(
          `start command ${inputs.props.runtime} is not supported, only custom/custom.debian10/custom-container supported!`,
        );
    }
  }
}
