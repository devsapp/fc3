import logger from './common/logger';
import { InputProps } from './impl/interface';
import { NodejsLocalInvoke  } from './impl/nodejsLocal';
import { PythonLocalInvoke  } from './impl/pythonLocal';
import { JavaLocalInvoke  } from './impl/javaLocal';
import { PhpLocalInvoke  } from './impl/phpLocal';
import { DotnetLocalInvoke  } from './impl/dotnetLocal';

export default class ComponentBuild {
  /**
   * @param inputs
   * @returns
   */
  public async invoke(inputs: InputProps) {
    logger.debug(`input: ${JSON.stringify(inputs.props)}`);
    logger.info('command invoke');
    switch (inputs.props.function.runtime) {
      case "nodejs6":
      case "nodejs8":
      case "nodejs10":
      case "nodejs12":
      case "nodejs14":
        let nodeLocalInvoker = new NodejsLocalInvoke(inputs);
        nodeLocalInvoker.invoke();
        break;
      case "python2.7":
      case "python3":
      case "python3.9":
      case "python3.10":
        let pythonLocalInvoker = new PythonLocalInvoke(inputs);
        pythonLocalInvoker.invoke();
        break;
      case "java8":
      case "java11":
        let javaLocalInvoker = new JavaLocalInvoke(inputs);
        javaLocalInvoker.invoke();
        break;
      case "php7.2":
        let phpLocalInvoker = new PhpLocalInvoke(inputs);
        phpLocalInvoker.invoke();
        break;
      case "dotnetcore2.1":
        let dotnetLocalInvoker = new DotnetLocalInvoke(inputs);
        dotnetLocalInvoker.invoke();
        break;
      default:
        logger.warn(`${inputs.props.function.runtime} is not supported`);
    }
    return {};
  }
}
