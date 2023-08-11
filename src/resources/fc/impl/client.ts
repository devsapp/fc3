import FCClient, {
  CreateFunctionInput,
  CreateFunctionRequest,
  CreateFunctionResponse,
  CreateTriggerInput,
  CreateTriggerRequest,
  CreateTriggerResponse,
  GetConcurrencyConfigResponse,
  GetFunctionCodeRequest,
  InvokeFunctionHeaders,
  InvokeFunctionRequest,
  ListFunctionVersionsRequest,
  ListFunctionsRequest,
  ListTriggersRequest,
  PublishFunctionVersionRequest,
  PublishVersionInput,
  PutConcurrencyConfigRequest,
  UpdateFunctionInput,
  UpdateFunctionRequest,
  UpdateFunctionResponse,
  UpdateTriggerInput,
  UpdateTriggerRequest,
  UpdateTriggerResponse,
} from '@alicloud/fc20230330';
import { ICredentials } from '@serverless-devs/component-interface';
import { RuntimeOptions } from '@alicloud/tea-util';
import { Readable } from 'stream';
import { Config } from '@alicloud/openapi-client';
import FC2 from '@alicloud/fc2';

import { FC_CLIENT_DEFAULT_TIMEOUT } from '../../../default/config';
import { IRegion, IFunction, ITrigger } from '../../../interface';
import { getCustomEndpoint } from './utils';

interface IOptions {
  timeout?: number;
  endpoint?: string;
}

export const fc2Client = (region: IRegion, credentials: ICredentials, customEndpoint: string) => {
  const { endpoint } = getCustomEndpoint(customEndpoint);

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
  customEndpoint: string;

  constructor(readonly region: IRegion, readonly credentials: ICredentials, options: IOptions) {
    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = credentials;
    this.customEndpoint = options.endpoint;
    const { timeout } = options || {};

    const { host: endpoint = `${accountID}.${region}.fc.aliyuncs.com`, protocol = 'https' } =
      getCustomEndpoint(options.endpoint);

    const config = new Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: timeout || FC_CLIENT_DEFAULT_TIMEOUT,
      connectTimeout: timeout || FC_CLIENT_DEFAULT_TIMEOUT,
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

  async createTrigger(functionName: string, config: ITrigger): Promise<CreateTriggerResponse> {
    const request = new CreateTriggerRequest({
      body: new CreateTriggerInput(config),
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
      const chunks: any[] = [];
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

  async getFunctionCode(
    functionName: string,
    qualifier?: string,
  ): Promise<{ checksum: string; url: string }> {
    const request = new GetFunctionCodeRequest({ qualifier });
    const result = await this.fc20230330Client.getFunctionCode(functionName, request);
    const { body } = result.toMap();
    return body;
  }

  async listTriggers(functionName: string) {
    const request = new ListTriggersRequest({ limit: 100 });
    const runtime = new RuntimeOptions({});
    const headers = {};
    return await this.fc20230330Client.listTriggersWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
  }

  async removeFunctionVersion(functionName: string, versionId: string) {
    const runtime = new RuntimeOptions({});
    const headers = {};
    const result = await this.fc20230330Client.deleteFunctionVersionWithOptions(
      functionName,
      versionId,
      headers,
      runtime,
    );
    const { body } = result.toMap();
    return body;
  }

  async publishFunctionVersion(functionName: string, description: string = '') {
    const request = new PublishFunctionVersionRequest({
      body: new PublishVersionInput({ description }),
    });
    const runtime = new RuntimeOptions({});
    const headers = {};
    const result = await this.fc20230330Client.publishFunctionVersionWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
    const { body } = result.toMap();
    return body;
  }

  async listFunctionVersion(functionName: string): Promise<any[]> {
    const request = new ListFunctionVersionsRequest({ limit: 100 });
    const runtime = new RuntimeOptions({});
    const headers = {};
    const result = await this.fc20230330Client.listFunctionVersionsWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
    const { body } = result.toMap();
    return body.versions;
  }

  async getFunctionConcurrency(functionName: string) {
    const result = await this.fc20230330Client.getConcurrencyConfig(functionName);
    const { body } = result.toMap();

    return body;
  }

  async putFunctionConcurrency(functionName: string, reservedConcurrency: number) {
    const request = new PutConcurrencyConfigRequest({ reservedConcurrency })

    const result = await this.fc20230330Client.putConcurrencyConfig(functionName, request);
    const { body } = result.toMap();

    return body;
  }

  async deleteFunctionConcurrency(functionName: string) {
    const result = await this.fc20230330Client.deleteConcurrencyConfig(functionName);
    const { body } = result.toMap();

    return body;
  }

  /**
   * list 接口实现模版
   */
  async listFunctions(prefix?: string): Promise<any[]> {
    let nextToken: string = '';
    const limit = 2;
    const functions: any[] = [];

    while (true) {
      const request = new ListFunctionsRequest({ limit, prefix, nextToken });
      const runtime = new RuntimeOptions({});
      const headers = {};
      const result = await this.fc20230330Client.listFunctionsWithOptions(
        request,
        headers,
        runtime,
      );
      const { body } = result.toMap();
      functions.push(...body.functions);
      if (!body.nextToken) {
        return functions;
      }
      nextToken = body.nextToken;
    }
  }
}
