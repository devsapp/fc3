import { ICredentials } from '@serverless-devs/component-interface';
import FCClient, {
  CreateFunctionInput,
  CreateFunctionRequest,
  CreateFunctionResponse,
  CreateTriggerInput,
  CreateTriggerRequest,
  CreateTriggerResponse,
  UpdateFunctionInput,
  UpdateFunctionRequest,
  UpdateFunctionResponse,
  UpdateTriggerInput,
  UpdateTriggerRequest,
  UpdateTriggerResponse,
} from '@alicloud/fc20230330';

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
}
