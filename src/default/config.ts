// 非 custom 的默认配置
export const FUNCTION_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
  memorySize: 512,
  timeout: 3,
};

// custom* 的默认配置
export const FUNCTION_CUSTOM_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
  instanceConcurrency: 1,
  memorySize: 512,
  timeout: 3,
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
  layers: [],
  instanceIsolationMode: 'SHARE',
  sessionAffinity: 'NONE',
};

export const FC_TRIGGER_DEFAULT_CONFIG = {
  qualifier: 'LATEST',
  description: '',
};

export const IMAGE_ACCELERATION_REGION = [
  'cn-hangzhou',
  'cn-shanghai',
  'cn-beijing',
  'cn-zhangjiakou',
  'cn-shenzhen',
  'cn-hongkong',
  'ap-southeast-1',
  'ap-northeast-1',
  'us-east-1',
  'us-west-1',
  'cn-huhehaote',
  'eu-central-1',
  'cn-wulanchabu',
  'cn-qingdao',
  'cn-chengdu',
  'ap-southeast-5',
  'cn-heyuan-acdr-1',
];

export const FC_CLIENT_CONNECT_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_CONNECT_TIMEOUT || '60', 10) * 1000;

export const FC_CLIENT_READ_TIMEOUT: number =
  parseInt(process.env.FC_CLIENT_READ_TIMEOUT || '60', 10) * 1000;

// seconds
export const FC_INSTANCE_EXEC_TIMEOUT: number = parseInt(
  process.env.FC_INSTANCE_EXEC_TIMEOUT || '600',
  10,
);

export const FC_CONTAINER_ACCELERATED_TIMEOUT: number = parseInt(
  process.env.FC_CONTAINER_ACCELERATED_TIMEOUT || '40',
  10,
);

export const FC_DEPLOY_RETRY_COUNT = 3;
