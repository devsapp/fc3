export const FUNCTION_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
};

export const FUNCTION_CUSTOM_DEFAULT_CONFIG = {
  internetAccess: true,
  description: '',
  instanceConcurrency: 1,
};

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
