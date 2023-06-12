import logger from './common/logger';
import { InputProps } from './impl/interface';
import { NodejsLocalInvoke } from './impl/invoke/nodejsLocalInvoke';
import { PythonLocalInvoke } from './impl/invoke/pythonLocalInvoke';
import { JavaLocalInvoke } from './impl/invoke/javaLocalInvoke';
import { PhpLocalInvoke } from './impl/invoke/phpLocalInvoke';
import { DotnetLocalInvoke } from './impl/invoke/dotnetLocalInvoke';
import { CustomLocalInvoke } from './impl/invoke/customLocalInvoke';
import { CustomContainerLocalInvoke } from './impl/invoke/customContainerLocalInvoke';
import { CustomLocalStart } from './impl/start/customLocalStart';
import { CustomContainerLocalStart } from './impl/start/customContainerLocalStart';

export default class ComponentBuild {
  /**
   * @param inputs
   * @returns
   */
  public async invoke(inputs: InputProps) {
    logger.debug(`invoke input: ${JSON.stringify(inputs.props)}`);
    if (inputs.props.triggers?.[0].type === "http") {
      logger.warn("http function should use local start");
      return {};
    }
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
      case "custom":
      case "custom.debian10":
        let customLocalInvoker = new CustomLocalInvoke(inputs);
        customLocalInvoker.invoke();
        break;
      case "custom-container":
        let customContainerLocalInvoker = new CustomContainerLocalInvoke(inputs);
        customContainerLocalInvoker.invoke();
        break;
      default:
        logger.warn(`${inputs.props.function.runtime} is not supported`);
    }
    return {};
  }

  public async start(inputs: InputProps) {
    logger.debug(`start input: ${JSON.stringify(inputs.props)}`);
    if (!(inputs.props.triggers?.[0].type === "http")) {
      logger.warn("http function should use local invoke");
      return {};
    }

    switch (inputs.props.function.runtime) {
      case "custom":
      case "custom.debian10":
        let customLocalInvoker = new CustomLocalStart(inputs);
        customLocalInvoker.start();
        break;
      case "custom-container":
        let customContainerLocalInvoker = new CustomContainerLocalStart(inputs);
        customContainerLocalInvoker.start();
        break;
      default:
        logger.warn(`${inputs.props.function.runtime} is not supported`);
    }
  }
}
