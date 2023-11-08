/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
import FCClient, {
  CreateAliasInput,
  CreateAliasRequest,
  CreateFunctionInput,
  CreateFunctionRequest,
  CreateFunctionResponse,
  CreateTriggerInput,
  CreateTriggerRequest,
  CreateTriggerResponse,
  DeleteProvisionConfigRequest,
  GetFunctionCodeRequest,
  GetProvisionConfigRequest,
  InvokeFunctionHeaders,
  InvokeFunctionRequest,
  ListAliasesRequest,
  ListFunctionsRequest,
  ListProvisionConfigsRequest,
  PublishFunctionVersionRequest,
  PublishVersionInput,
  PutConcurrencyConfigRequest,
  PutConcurrencyInput,
  PutProvisionConfigInput,
  PutProvisionConfigRequest,
  UpdateAliasInput,
  UpdateAliasRequest,
  UpdateFunctionInput,
  UpdateFunctionRequest,
  UpdateFunctionResponse,
  UpdateTriggerInput,
  UpdateTriggerRequest,
  UpdateTriggerResponse,
  PutAsyncInvokeConfigRequest,
  PutAsyncInvokeConfigInput,
  PutAsyncInvokeConfigResponse,
  ListLayersRequest,
  CreateVpcBindingRequest,
  CreateVpcBindingInput,
} from '@alicloud/fc20230330';
import { ICredentials } from '@serverless-devs/component-interface';
import { RuntimeOptions } from '@alicloud/tea-util';
import { Readable } from 'stream';
import { Config } from '@alicloud/openapi-client';
import FC2 from '@alicloud/fc2';

import { FC_CLIENT_CONNECT_TIMEOUT, FC_CLIENT_READ_TIMEOUT } from '../../../default/config';
import { IRegion, IFunction, ITrigger, IAsyncInvokeConfig } from '../../../interface';
import { getCustomEndpoint } from './utils';
import _ from 'lodash';
import logger from '../../../logger';
import { IAlias } from '../../../interface/cli-config/alias';
import { IProvision } from '../../../interface/cli-config/provision';

const httpx = require('httpx');

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
    timeout: FC_CLIENT_READ_TIMEOUT,
  });
};

export default class FC_Client {
  readonly fc20230330Client: FCClient;
  customEndpoint: string;

  constructor(
    readonly region: IRegion,
    readonly credentials: ICredentials,
    options: IOptions,
  ) {
    const {
      AccountID: accountID,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
      SecurityToken: securityToken,
    } = credentials;
    this.customEndpoint = options.endpoint;
    const { timeout } = options || {};

    const { host: endpoint = `${accountID}.${region}.fc.aliyuncs.com`, protocol = 'http' } =
      getCustomEndpoint(options.endpoint);

    const config = new Config({
      accessKeyId,
      accessKeySecret,
      securityToken,
      protocol,
      endpoint,
      readTimeout: timeout || FC_CLIENT_READ_TIMEOUT,
      connectTimeout: timeout || FC_CLIENT_CONNECT_TIMEOUT,
      userAgent: 'serverless-devs',
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

  async removeTrigger(functionName: string, triggerName: string) {
    const headers = {};
    const runtime = new RuntimeOptions({});
    const result = await this.fc20230330Client.deleteTriggerWithOptions(
      functionName,
      triggerName,
      headers,
      runtime,
    );
    return result;
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
    {
      payload,
      qualifier,
      invokeType,
      statefulAsyncInvocationId,
    }: {
      payload?: string;
      qualifier?: string;
      invokeType?: string;
      statefulAsyncInvocationId?: string;
    } = {},
  ) {
    const runtime = new RuntimeOptions({});
    // xFcLogType in ['None' , 'Tail'], xFcInvocationType in ['Sync, 'Async', 'Task']
    let logType = 'Tail';
    if (invokeType === 'Async' || invokeType === 'Task') {
      logType = 'None';
    }
    const headers = new InvokeFunctionHeaders({
      xFcLogType: logType,
      xFcInvocationType: invokeType,
    });

    if (statefulAsyncInvocationId) {
      // TODO
    }
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

    const body = await httpx.read(result.body);
    const res = result.toMap();
    res.body = body.toString('utf-8');
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

  async publishFunctionVersion(functionName: string, description = '') {
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

  async getAlias(functionName: string, aliasName: string) {
    const result = await this.fc20230330Client.getAlias(functionName, aliasName);
    const { body } = result.toMap();
    logger.debug(`get ${functionName} alias ${aliasName} body: ${JSON.stringify(body)}`);
    return body;
  }

  async listAlias(functionName: string): Promise<any[]> {
    const request = new ListAliasesRequest({ limit: 100 });
    const runtime = new RuntimeOptions({});
    const headers = {};
    const result = await this.fc20230330Client.listAliasesWithOptions(
      functionName,
      request,
      headers,
      runtime,
    );
    const { body } = result.toMap();
    logger.debug(`list ${functionName} aliases body: ${JSON.stringify(body)}`);
    return body.aliases;
  }

  async createAlias(functionName: string, config: IAlias) {
    const request = new CreateAliasRequest({
      body: new CreateAliasInput(config),
    });
    return await this.fc20230330Client.createAlias(functionName, request);
  }

  async removeAlias(functionName: string, aliasName: string) {
    return await this.fc20230330Client.deleteAlias(functionName, aliasName);
  }

  async updateAlias(functionName: string, aliasName: string, config: IAlias) {
    const request = new UpdateAliasRequest({
      body: new UpdateAliasInput(config),
    });

    return await this.fc20230330Client.updateAlias(functionName, aliasName, request);
  }

  async listFunctionProvisionConfig(functionName: string) {
    const request = new ListProvisionConfigsRequest({ functionName, limit: 100 });
    const result = await this.fc20230330Client.listProvisionConfigs(request);
    const { body } = result.toMap();
    logger.debug(`List ${functionName} provision body: ${JSON.stringify(body)}`);
    return body.provisionConfigs;
  }

  async getFunctionProvisionConfig(functionName: string, qualifier: string) {
    const request = new GetProvisionConfigRequest({ qualifier });
    const result = await this.fc20230330Client.getProvisionConfig(functionName, request);
    const { body } = result.toMap();
    logger.debug(`Get ${functionName}(${qualifier}) provision body: ${JSON.stringify(body)}`);
    if (_.isEmpty(body.functionArn)) {
      return {};
    }
    return body;
  }

  async removeFunctionProvisionConfig(functionName: string, qualifier: string) {
    const request = new DeleteProvisionConfigRequest({ qualifier });
    const result = await this.fc20230330Client.deleteProvisionConfig(functionName, request);
    const { body } = result.toMap();
    logger.debug(
      `Delete ${functionName}(${qualifier}) provision result body: ${JSON.stringify(body)}`,
    );
    return body;
  }

  async putFunctionProvisionConfig(functionName: string, qualifier: string, config: IProvision) {
    logger.debug(`put ${functionName}(${qualifier}) provision config: ${JSON.stringify(config)}`);
    const request = new PutProvisionConfigRequest({
      qualifier,
      body: new PutProvisionConfigInput(config),
    });
    const result = await this.fc20230330Client.putProvisionConfig(functionName, request);
    const { body } = result.toMap();
    return body;
  }

  async getFunctionConcurrency(functionName: string) {
    const result = await this.fc20230330Client.getConcurrencyConfig(functionName);
    const { body } = result.toMap();
    logger.debug(`list ${functionName} concurrency body: ${JSON.stringify(body)}`);
    return body;
  }

  async putFunctionConcurrency(functionName: string, reservedConcurrency: number) {
    const request = new PutConcurrencyConfigRequest({
      body: new PutConcurrencyInput({ reservedConcurrency }),
    });

    const result = await this.fc20230330Client.putConcurrencyConfig(functionName, request);
    const { body } = result.toMap();

    return body;
  }

  async removeFunctionConcurrency(functionName: string) {
    const result = await this.fc20230330Client.deleteConcurrencyConfig(functionName);
    const { body } = result.toMap();

    return body;
  }

  /**
   * list 接口实现模版
   */
  async listFunctions(prefix?: string): Promise<any[]> {
    let nextToken = '';
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

  async putAsyncInvokeConfig(
    functionName: string,
    qualifier: string,
    config: IAsyncInvokeConfig,
  ): Promise<PutAsyncInvokeConfigResponse> {
    const request = new PutAsyncInvokeConfigRequest({
      body: new PutAsyncInvokeConfigInput(config),
      qualifier,
    });

    logger.debug(`putAsyncInvokeConfig config = ${JSON.stringify(request)}`);
    return await this.fc20230330Client.putAsyncInvokeConfig(functionName, request);
  }

  async createVpcBinding(functionName: string, vpcId: string): Promise<any> {
    const request = new CreateVpcBindingRequest({ body: new CreateVpcBindingInput({ vpcId }) });
    return await this.fc20230330Client.createVpcBinding(functionName, request);
  }

  async deleteVpcBinding(functionName: string, vpcId: string): Promise<any> {
    return await this.fc20230330Client.deleteVpcBinding(functionName, vpcId);
  }

  async listLayers(query: any) {
    const request = new ListLayersRequest(query);
    const result = await this.fc20230330Client.listLayers(request);
    const { body } = result.toMap();
    logger.debug(`listLayers response  body: ${JSON.stringify(body)}`);
    return body;
  }
}
