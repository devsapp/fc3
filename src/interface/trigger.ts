
export enum TriggerType {
  oss = 'oss',
  log = 'log',
  timer = 'timer',
  eventbridge = 'eventbridge',
  http = 'http',
  mns_topic = 'mns_topic',
  cdn_events = 'cdn_events',
  tablestore = 'tablestore',
}

export enum Methods {
  HEAD = 'HEAD',
  DELETE = 'DELETE',
  POST = 'POST',
  GET = 'GET',
  OPTIONS = 'OPTIONS',
  PUT = 'PUT',
  PATCH = 'PATCH',
}

export type ITriggerType = `${TriggerType}`;

export interface IOssTriggerConfig {
  bucketName: string;
  events: string[];
  filter: {
    Key: {
      Prefix: string;
      Suffix: string;
    };
  };
}

export interface ILogTriggerConfig {
  jobConfig: {
    maxRetryTime?: string;
    triggerInterval?: string;
  };
  logConfig: {
    project: string;
    logstore: string;
  };
  sourceConfig: {
    logstore: string;
  };
  functionParameter?: {
    [key: string]: any;
  };
  enable: boolean;
}

export interface ITimerTriggerConfig {
  cronExpression: string;
  enable: boolean;
  payload?: string;
}

export interface IHttpTriggerConfig {
  authType: string;
  methods: `${Methods}`[];
}

export interface IMnsTriggerConfig {
  topicName: string;
  region?: string;
  notifyContentFormat?: 'STREAM' | 'JSON';
  notifyStrategy?: 'BACKOFF_RETRY' | 'EXPONENTIAL_DECAY_RETRY';
  filterTag?: string;
}

export interface ICdnTriggerConfig {
  eventName: string;
  eventVersion: string;
  notes: string;
  filter: {
    domain: string[];
  };
}

export interface IOtsConfig {
  instanceName: string;
  tableName: string;
}

export interface IEventBridge {
  // TODO
}

export default interface ITrigger {
  triggerName: string;
  triggerType: ITriggerType;

  description?: string;
  qualifier?: string;
  sourceArn?: string;
  invocationRole?: string;

  triggerConfig: IOssTriggerConfig | ILogTriggerConfig | ITimerTriggerConfig | IHttpTriggerConfig | IMnsTriggerConfig | ICdnTriggerConfig | IOtsConfig | IEventBridge;
}
