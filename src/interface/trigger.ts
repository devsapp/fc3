/* eslint-disable @typescript-eslint/no-empty-interface */
import { TriggerType, Methods, OSSEvents } from './base';

export type ITriggerType = `${TriggerType}`;

export interface IOssTriggerConfig {
  events: Array<`${OSSEvents}`>;
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
  authType: 'anonymous' | 'function' | 'jwt';
  methods: Array<`${Methods}`>;
  disableURLInternet?: boolean;
  authConfig?: {
    jwks: {
      keys: [
        {
          e: string;
          kid?: string;
          kty: string;
          alg: string;
          use: string;
          n: string;
        },
      ];
    };
    tokenLookup?:
      | [
          {
            type: 'header' | 'cookie' | 'query' | 'form';
            name: string;
            prefix?: string;
          },
        ]
      | string;
    claimPassBy?:
      | [
          {
            type: 'header' | 'cookie' | 'form';
            name: string;
            mapedName: string;
          },
        ]
      | string;
    whitelist?: string[];
    blacklist?: string[];
  };
}

export function instanceOfIHttpTriggerConfig(data: any): data is IHttpTriggerConfig {
  return 'authType' in data && 'methods' in data;
}

export function convertIHttTriggerConfig(
  httpTriggerConfig: IHttpTriggerConfig,
): IHttpTriggerConfig {
  if (httpTriggerConfig.authType !== 'jwt') {
    return httpTriggerConfig;
  }
  if (
    httpTriggerConfig.authConfig.tokenLookup &&
    typeof httpTriggerConfig.authConfig.tokenLookup !== 'string'
  ) {
    // eslint-disable-next-line no-param-reassign
    httpTriggerConfig.authConfig.tokenLookup = httpTriggerConfig.authConfig.tokenLookup
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item.type === 'header') {
          return `${item.type}:${item.name}${item.prefix ? `:${item.prefix}` : ''}`;
        }
        return `${item.type}:${item.name}`;
      })
      .join(',');
  }
  if (
    httpTriggerConfig.authConfig.claimPassBy &&
    typeof httpTriggerConfig.authConfig.claimPassBy !== 'string'
  ) {
    // eslint-disable-next-line no-param-reassign
    httpTriggerConfig.authConfig.claimPassBy = httpTriggerConfig.authConfig.claimPassBy
      .map((item) => {
        return `${item.type}:${item.name}:${item.mapedName}`;
      })
      .join(',');
  }
  if (!httpTriggerConfig.authConfig.claimPassBy) {
    // eslint-disable-next-line no-param-reassign
    httpTriggerConfig.authConfig.claimPassBy = 'query::';
  }
  if (httpTriggerConfig.authConfig.whitelist) {
    // eslint-disable-next-line no-param-reassign
    httpTriggerConfig.authConfig.blacklist = null;
  }
  return httpTriggerConfig;
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
