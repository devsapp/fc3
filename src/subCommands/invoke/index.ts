import { ICredentials } from '@serverless-devs/component-interface';
import { yellow, green, red, bold } from 'chalk';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';

import { IInputs } from '../../interface';
import logger from '../../logger';
import FC from '../../resources/fc';
import { parseArgv } from '@serverless-devs/utils';

export default class Invoke {
  private functionName: string;
  private fcSdk: FC;
  private payload: string;
  private qualifier: string;
  private invokeType: string;
  private statefulAsyncInvocationId: string;

  constructor(inputs: IInputs) {
    this.functionName = inputs.props.function?.functionName;
    let timeout = inputs.props.function?.timeout + 3; // 加大3s
    if (FC.isCustomContainerRuntime(inputs.props.function.runtime)) {
      timeout = inputs.props.function?.timeout + 30; // 考虑冷启动镜像的 pull 时间
    }
    this.fcSdk = new FC(inputs.props.region, inputs.credential as ICredentials, {
      timeout: timeout ? timeout * 1000 : undefined,
      endpoint: inputs.props.endpoint,
    });
    const {
      event: payload,
      'event-file': eventFile,
      'invocation-type': invocationType,
      qualifier,
      'stateful-async-invocation-id': statefulAsyncInvocationId,
    } = parseArgv(inputs.args, {
      alias: {
        event: 'e',
        'event-file': 'f',
      },
      string: ['event', 'event-file'],
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
    if (qualifier !== undefined) {
      this.qualifier = qualifier;
    }
    if (statefulAsyncInvocationId !== undefined) {
      this.statefulAsyncInvocationId = statefulAsyncInvocationId;
    }
  }

  async run() {
    logger.debug(`Running invoke payload: ${this.payload}`);

    const result = await this.fcSdk.invokeFunction(this.functionName, {
      payload: this.payload,
      qualifier: this.qualifier,
      invokeType: this.invokeType,
      statefulAsyncInvocationId: this.statefulAsyncInvocationId,
    });
    logger.debug(`invoke function ${this.functionName} result ${JSON.stringify(result)}`);

    this.showLog(result.headers, result.body);
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
${bold('Qualifier:')} ${green(qualifier)}
${bold('RequestId:')} ${green(requestId)}
`;

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
