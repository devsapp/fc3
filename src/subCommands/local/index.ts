import { NodejsLocalInvoke } from './impl/invoke/nodejsLocalInvoke';
import { PythonLocalInvoke } from './impl/invoke/pythonLocalInvoke';
import { JavaLocalInvoke } from './impl/invoke/javaLocalInvoke';
import { PhpLocalInvoke } from './impl/invoke/phpLocalInvoke';
import { DotnetLocalInvoke } from './impl/invoke/dotnetLocalInvoke';
import { CustomLocalInvoke } from './impl/invoke/customLocalInvoke';
import { CustomContainerLocalInvoke } from './impl/invoke/customContainerLocalInvoke';
import { CustomLocalStart } from './impl/start/customLocalStart';
import { CustomContainerLocalStart } from './impl/start/customContainerLocalStart';

import { IInputs } from '../../interface';
import logger from '../../logger';

/**
 * TODO: run 镜像需要将 -H
 * -H "Content-Type: application/octet-stream" -H "x-fc-request-id: 1640dd8c-9d08-4b7b-9e5b-ce9913789421" -H "x-fc-function-name: fc3-event-custom-container" -H "x-fc-function-memory: 1024" -H "x-fc-function-timeout: 30" -H "x-fc-initialization-timeout: undefined" -H "x-fc-function-initializer: undefined" -H "x-fc-function-handler: index.handler" -H "x-fc-account-id: 143**********149" -H "x-fc-region: cn-huhehaote" -H "x-fc-access-key-id: LTA******************ibC " -H "x-fc-access-key-secret: AtY************************V8q" -H "x-fc-security-token: "
 */
export default class ComponentBuild {
  /**
   * @param inputs
   * @returns
   */
  public async invoke(inputs: IInputs) {
    logger.debug(`invoke input: ${JSON.stringify(inputs.props)}`);

    switch (inputs.props.function.runtime) {
      // case 'nodejs6':
      // case 'nodejs8':
      case 'nodejs10':
      case 'nodejs12':
      case 'nodejs14':
      case 'nodejs16':
        let nodeLocalInvoker = new NodejsLocalInvoke(inputs);
        await nodeLocalInvoker.invoke();
        break;
      case 'python2.7':
      case 'python3':
      case 'python3.9':
      case 'python3.10':
        let pythonLocalInvoker = new PythonLocalInvoke(inputs);
        await pythonLocalInvoker.invoke();
        break;
      case 'java8':
      case 'java11':
        let javaLocalInvoker = new JavaLocalInvoke(inputs);
        await javaLocalInvoker.invoke();
        break;
      case 'php7.2':
        let phpLocalInvoker = new PhpLocalInvoke(inputs);
        await phpLocalInvoker.invoke();
        break;
      case 'dotnetcore2.1':
        let dotnetLocalInvoker = new DotnetLocalInvoke(inputs);
        await dotnetLocalInvoker.invoke();
        break;
      case 'custom':
      case 'custom.debian10':
        let customLocalInvoker = new CustomLocalInvoke(inputs);
        await customLocalInvoker.invoke();
        break;
      case 'custom-container':
        let customContainerLocalInvoker = new CustomContainerLocalInvoke(inputs);
        await customContainerLocalInvoker.invoke();
        break;
      default:
        logger.error(`${inputs.props.function.runtime} is not supported`);
    }
    return {};
  }

  public async start(inputs: IInputs) {
    logger.debug(`start input: ${JSON.stringify(inputs.props)}`);

    switch (inputs.props.function.runtime) {
      case 'custom':
      case 'custom.debian10':
        let customLocalInvoker = new CustomLocalStart(inputs);
        await customLocalInvoker.start();
        break;
      case 'custom-container':
        let customContainerLocalInvoker = new CustomContainerLocalStart(inputs);
        await customContainerLocalInvoker.start();
        break;
      default:
        logger.error(`${inputs.props.function.runtime} is not supported`);
    }
  }
}
