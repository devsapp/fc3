export const FC_DEFAULT_CONFIG = {
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
  internetAccess: true,
  environmentVariables: {},
  description: '',
};
