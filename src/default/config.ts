// 非 custom 的默认配置
export const FUNCTION_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
};

// custom* 的默认配置
export const FUNCTION_CUSTOM_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
  instanceConcurrency: 1,
};

// 如果函数资源为空时使用默认配置，为了覆盖线上的配置
export const FC_RESOURCES_EMPTY_CONFIG = {
  vpcConfig: {
    securityGroupId: '',
    vSwitchIds: [],
    vpcId: '',
  },
  tracingConfig: {},
  ossMountConfig: {
    mountPoints: [],
  },
  nasConfig: {
    groupId: 0,
    userId: 0,
    mountPoints: [],
  },
  logConfig: {
    enableInstanceMetrics: false,
    enableRequestMetrics: false,
    logBeginRule: 'None',
    logstore: '',
    project: '',
  },
  environmentVariables: {},
};

export const FC_TRIGGER_DEFAULT_CONFIG = {
  qualifier: 'LATEST',
  description: '',
};

export const FC_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_CONNECT_TIMEOUT || '5') * 1000;

export const FC_CLIENT_READ_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_READ_TIMEOUT || '10') * 1000;

export const FC_DEPLOY_RETRY_COUNT = 3;
