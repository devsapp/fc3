import { TriggerType, Methods, OSSEvents } from './base';

export type ITriggerType = `${TriggerType}`;

export interface IOssTriggerConfig {
  events: `${OSSEvents}`[];
  filter: {
    key: {
      prefix: string;
      suffix: string;
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
  authType: 'anonymous' | 'function';
  methods: `${Methods}`[];
  disableURLInternet?: boolean;
  authConfig?: string;
}

export interface IMnsTriggerConfig {
  notifyContentFormat: 'STREAM' | 'JSON';
  notifyStrategy: 'BACKOFF_RETRY' | 'EXPONENTIAL_DECAY_RETRY';
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

export interface IOtsConfig {}

export interface IEventBridge {
  triggerEnable: boolean;
  asyncInvocationType: boolean;
  eventRuleFilterPattern: string;
  eventSourceConfig: {
    eventSourceType: string;
    eventSourceParameters: object;
  };
  eventSinkConfig: {
    deliveryOption: object;
  };
  runOptions: object;
}

export interface ITrigger {
  triggerName: string;
  triggerType: ITriggerType;

  description?: string;
  qualifier?: string;
  sourceArn?: string;
  invocationRole?: string;

  triggerConfig:
    | IOssTriggerConfig
    | ILogTriggerConfig
    | ITimerTriggerConfig
    | IHttpTriggerConfig
    | IMnsTriggerConfig
    | ICdnTriggerConfig
    | IOtsConfig
    | IEventBridge;
}
