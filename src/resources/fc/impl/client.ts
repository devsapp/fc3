import { ICredentials } from '@serverless-devs/component-interface';
import FCClient, {
  CreateFunctionInput,
  CreateFunctionRequest,
  CreateFunctionResponse,
  CreateTriggerInput,
  CreateTriggerRequest,
  CreateTriggerResponse,
  InvokeFunctionHeaders,
  InvokeFunctionRequest,
  UpdateFunctionInput,
  UpdateFunctionRequest,
  UpdateFunctionResponse,
  UpdateTriggerInput,
  UpdateTriggerRequest,
  UpdateTriggerResponse,
} from '@alicloud/fc20230330';
import { RuntimeOptions } from '@alicloud/tea-util';
import { Readable } from 'stream';

import { Config } from '@alicloud/openapi-client';
import FC2 from '@alicloud/fc2';
import { getCustomEndpoint, FC_CLIENT_DEFAULT_TIMEOUT } from '../../../default/client';
import { IRegion, IFunction, ITrigger } from '../../../interface';

export const fc2Client = (region: IRegion, credentials: ICredentials) => {
  const { endpoint } = getCustomEndpoint();

  return new FC2(credentials.AccountID, {
    accessKeyID: credentials.AccessKeyID,
    accessKeySecret: credentials.AccessKeySecret,
    securityToken: credentials.SecurityToken,
    region,
    endpoint,
    secure: true,
    timeout: FC_CLIENT_DEFAULT_TIMEOUT,
  });
};

export default class FC_Client {
  readonly fc20230330Client: FCClient;

  constructor(readonly region: IRegion, readonly credentials: ICredentials) {
    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = credentials;

    const { host: endpoint = `${accountID}.${region}.fc.aliyuncs.com`, protocol = 'https' } =
      getCustomEndpoint();

    const config = new Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: FC_CLIENT_DEFAULT_TIMEOUT,
      connectTimeout: FC_CLIENT_DEFAULT_TIMEOUT,
    });

    this.fc20230330Client = new FCClient(config);
  }

  async createFunction(config: IFunction): Promise<CreateFunctionResponse> {
    const request = new CreateFunctionRequest({
      body: new CreateFunctionInput(config),
    });

    return await this.fc20230330Client.createFunction(request);
  }

  async updateFunction(config: IFunction): Promise<UpdateFunctionResponse> {
    const request = new UpdateFunctionRequest({
      body: new UpdateFunctionInput(config),
    });

    return await this.fc20230330Client.updateFunction(config.functionName, request);
  }

  async createTrigger(
    functionName: string,
    triggerConfig: ITrigger,
  ): Promise<CreateTriggerResponse> {
    const request = new CreateTriggerRequest({
      body: new CreateTriggerInput(triggerConfig),
    });

    return await this.fc20230330Client.createTrigger(functionName, request);
  }

  async updateTrigger(
    functionName: string,
    triggerName: string,
    triggerConfig: ITrigger,
  ): Promise<UpdateTriggerResponse> {
    const request = new UpdateTriggerRequest({
      body: new UpdateTriggerInput(triggerConfig),
    });
    return await this.fc20230330Client.updateTrigger(functionName, triggerName, request);
  }

  async invokeFunction(
    functionName: string,
    { payload, qualifier }: { payload?: string; qualifier?: string } = {},
  ) {
    const runtime = new RuntimeOptions({});
    const headers = new InvokeFunctionHeaders({ xFcLogType: 'Tail' }); // 'None' : 'Tail'
    const request = new InvokeFunctionRequest({
      qualifier,
      body: payload ? Readable.from(Buffer.from(payload, 'utf8')) : undefined,
    });

    const result = await this.fc20230330Client.invokeFunctionWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      result.body.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      result.body.on('error', (err) => reject(err));
      result.body.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    const res = result.toMap();
    res.body = body;
    if (res.headers?.['x-fc-log-result']) {
      res.headers['x-fc-log-result'] = Buffer.from(
        res.headers?.['x-fc-log-result'],
        'base64',
      ).toString();
    }

    return res;
  }
}