import { ICredentials } from '@serverless-devs/component-interface';
import { yellow, green, red, bold } from 'chalk';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';

import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import FC from '../../resources/fc';
import { parseArgv } from '@serverless-devs/utils';
import { isAppCenter } from '../../utils';

export default class Invoke {
  private functionName: string;
  private fcSdk: FC;
  private payload: string;
  private qualifier: string;
  private invokeType: string;
  private asyncTaskId: string;
  private region: IRegion;
  private silent: boolean;

  constructor(inputs: IInputs) {
    const {
      event: payload,
      'event-file': eventFile,
      'invocation-type': invocationType,
      qualifier,
      'async-task-id': asyncTaskId,
      timeout,
      region,
      'function-name': functionName,
      silent,
    } = parseArgv(inputs.args, {
      alias: {
        event: 'e',
        'event-file': 'f',
      },
      string: ['event', 'event-file', 'timeout', 'region', 'function-name'],
      boolean: ['silent'],
    });
    this.region = region || _.get(inputs, 'props.region');
    logger.debug(`region: ${this.region}`);
    checkRegion(this.region);
    this.functionName = functionName || inputs.props?.functionName;
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    let sdkTimeout = timeout;
    if (!timeout) {
      sdkTimeout = inputs.props?.timeout + 5; // 加大5s
      if (FC.isCustomContainerRuntime(inputs.props.runtime)) {
        sdkTimeout = inputs.props?.timeout + 30; // 考虑冷启动镜像的 pull 时间
      }
    } else {
      sdkTimeout = parseInt(timeout, 10);
    }
    const function_ai = isAppCenter() ? 'function_ai;' : '';
    this.fcSdk = new FC(this.region, inputs.credential as ICredentials, {
      timeout: sdkTimeout ? sdkTimeout * 1000 : undefined,
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `${function_ai}Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:invoke`,
    });

    if (_.isString(payload)) {
      this.payload = payload;
    } else if (_.isString(eventFile) && eventFile) {
      const p = path.isAbsolute(eventFile) ? eventFile : path.join(process.cwd(), eventFile);
      if (!fs.existsSync(p)) {
        throw new Error(`Cannot find event-file "${eventFile}".`);
      }
      this.payload = fs.readFileSync(p, 'utf-8');
    }
    this.invokeType = 'Sync';
    this.qualifier = 'LATEST';
    if (invocationType !== undefined) {
      this.invokeType = invocationType;
    }
    const allowedInvocationTypes = ['Sync', 'Async'];
    if (!allowedInvocationTypes.includes(this.invokeType)) {
      throw new Error(
        `Invalid 'invocationType': ${
          this.invokeType
        }. Allowed values are: ${allowedInvocationTypes.join(', ')}`,
      );
    }
    if (qualifier !== undefined) {
      this.qualifier = qualifier;
    }
    if (asyncTaskId !== undefined) {
      this.asyncTaskId = asyncTaskId;
    }
    this.silent = silent;
  }

  async run() {
    logger.debug(`Running invoke payload: ${this.payload}`);

    const result = await this.fcSdk.invokeFunction(this.functionName, {
      payload: this.payload,
      qualifier: this.qualifier,
      invokeType: this.invokeType,
      asyncTaskId: this.asyncTaskId,
    });
    logger.debug(`invoke function ${this.functionName} result ${JSON.stringify(result)}`);
    if (this.silent) {
      // console.log(result.body);
      return {
        body: result.body,
      };
    } else {
      this.showLog(result.headers, result.body);
    }
  }

  private showLog(headers, body) {
    const {
      'x-fc-code-checksum': codeChecksum,
      'x-fc-instance-id': instanceId,
      'x-fc-invocation-service-version': qualifier,
      'x-fc-request-id': requestId,
      'x-fc-error-type': errorType,
      'x-fc-log-result': log,
    } = headers || {};

    const startStr = yellow('========= FC invoke Logs begin =========');
    const endStr = yellow('========= FC invoke Logs end =========');

    let showLog = `${startStr}\n${log}\n${endStr}\n
${bold('Invoke instanceId:')} ${green(instanceId)}
${bold('Code Checksum:')} ${green(codeChecksum)}
${bold('Qualifier:')} ${green(qualifier || 'LATEST')}
${bold('RequestId:')} ${green(requestId)}
`;
    if (this.invokeType === 'Async') {
      const { 'x-fc-async-task-id': taskId } = headers || {};
      showLog = `${bold('Qualifier:')} ${green(qualifier || 'LATEST')}
${bold('RequestId:')} ${green(requestId)}
${bold('AsyncTaskId:')} ${green(taskId)}
`;
    }

    if (headers['x-fc-error-type']) {
      showLog += `${bold('Error Type:')} ${red(errorType)}

${bold('Invoke Result:')}
${red(body)}`;
    } else {
      showLog += `
${bold('Invoke Result:')}
${green(body)}`;
    }

    logger.write(showLog);
  }
}
