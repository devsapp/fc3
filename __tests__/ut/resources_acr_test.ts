import Role from '../../src/resources/ram';
import Sls from '../../src/resources/sls';
import VpcNas from '../../src/resources/vpc-nas';
import { getCustomEndpoint } from '../../src/resources/fc/impl/utils';
import replaceFunction from '../../src/resources/fc/impl/replace-function-config';
import log from '../../src/logger';
import { IVpcConfig } from '../../src/interface';
log._set(console);

describe('Role', () => {
  describe('isRoleArnFormat', () => {
    it('should return true when role is in arn format', () => {
      const roleArn = 'acs:ram::1234567890123456:role/my-role';
      expect(Role.isRoleArnFormat(roleArn)).toBe(true);
    });

    it('should return false for an invalid role ARN', () => {
      const invalidRoleArn = 'acs:ram::1234567890123456:role';
      expect(Role.isRoleArnFormat(invalidRoleArn)).toBe(false);
    });
  });

  describe('completionArn', () => {
    const debugMock = jest.spyOn(log, 'debug');

    it('should return the input role if it is a valid ARN', () => {
      const validRoleArn = 'acs:ram::1234567890123456:role/my-role';
      const accountID = '1234567890123456';

      const result = Role.completionArn(validRoleArn, accountID);
      expect(result).toEqual(validRoleArn);
      expect(debugMock).toHaveBeenCalledWith(`Use role: ${validRoleArn}`);
    });

    it('should return a correctly formatted ARN for a role name', () => {
      const roleName = 'my-role';
      const accountID = '1234567890123456';
      const expectedArn = 'acs:ram::1234567890123456:role/my-role';

      const result = Role.completionArn(roleName, accountID);
      expect(result).toEqual(expectedArn);
      expect(debugMock).toHaveBeenCalledWith(`Assemble role: ${expectedArn}`);
    });
  });
});

describe('Sls', () => {
  describe('generateProjectName', () => {
    it('test generateProjectName', () => {
      const region = 'cn-hangzhou';
      const accessKeyId = 'accessKeyId';

      const result = Sls.generateProjectName(region, accessKeyId);
      expect(result).toEqual(`${accessKeyId}-${region}-project`);
    });
  });

  describe('generateLogstoreName', () => {
    it('test generateLogstoreName', () => {
      const result = Sls.generateLogstoreName();

      expect(result).toBe('function-logstore');
    });
  });
});

describe('VpcNas', () => {
  let vpcNasClass: VpcNas;
  const region = 'cn-hangzhou';
  const credentials = {
    AccessKeyID: 'test',
    AccessKeySecret: 'test',
    SecurityToken: 'test',
    AccountID: 'test',
  };

  beforeEach(() => {
    vpcNasClass = new VpcNas(region, credentials);
  });

  describe('getVpcNasRule', () => {
    it('should return vpc nas rule', async () => {
      const vpcConfig: IVpcConfig = {
        vpcId: 'test',
        vSwitchIds: 'auto',
        securityGroupId: 'test',
      };

      const result = await vpcNasClass.getVpcNasRule(vpcConfig);

      expect(result).toBe('Alibaba-Fc-V3-Component-Generated');
    });
  });
});

describe('getCustomEndpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty object when CUSTOM_ENDPOINT is not provided', () => {
    delete process.env.FC_CLIENT_CUSTOM_ENDPOINT;
    const result = getCustomEndpoint();
    expect(result).toEqual({});
  });

  it('should return custom endpoint with http protocol when CUSTOM_ENDPOINT starts with http://', () => {
    process.env.FC_CLIENT_CUSTOM_ENDPOINT = 'http://customendpoint.com';
    const result = getCustomEndpoint();
    expect(result).toEqual({
      protocol: 'http',
      host: 'customendpoint.com',
      endpoint: 'http://customendpoint.com',
    });
  });

  it('should return custom endpoint with https protocol when CUSTOM_ENDPOINT starts with https://', () => {
    process.env.FC_CLIENT_CUSTOM_ENDPOINT = 'https://customendpoint.com';
    const result = getCustomEndpoint();
    expect(result).toEqual({
      protocol: 'https',
      host: 'customendpoint.com',
      endpoint: 'https://customendpoint.com',
    });
  });

  it('should return custom endpoint with https protocol and endpoint when CUSTOM_ENDPOINT is provided without protocol', () => {
    const result = getCustomEndpoint('customendpoint.com');
    expect(result).toEqual({
      protocol: 'https',
      host: 'customendpoint.com',
      endpoint: 'https://customendpoint.com',
    });
  });
});

describe('replaceFunction', () => {
  it('should merge local and remote configurations correctly', () => {
    const local = {
      nasConfig: {
        mountPoints: [],
      },
      vpcConfig: 'AUTO',
      logConfig: {
        project: '',
      },
      role: '',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
        },
        preStop: {
          handler: '',
        },
      },
      runtime: 'customContainer',
    };
    const remote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 60,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 30,
        },
      },
      customContainerConfig: {
        image: 'my-image',
      },
      lastUpdateStatus: 'Success',
      state: 'Running',
    };
    const expectedLocal = {
      nasConfig: {
        mountPoints: [],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: '',
      },
      role: '',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
          timeout: 3,
        },
        preStop: {
          handler: '',
          timeout: 3,
        },
      },
      runtime: 'customContainer',
    };
    const expectedRemote = {
      customContainerConfig: {
        image: 'my-image',
      },
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 60,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 30,
        },
      },
      logConfig: {
        logstore: 'my-logstore',
        project: 'my-project',
      },
      nasConfig: {
        mountPoints: [
          {
            mountDir: '/mnt/nas',
            serverAddr: 'nas-server',
          },
        ],
      },
      role: 'my-role',
      vpcConfig: {
        securityGroupId: 'sg-123',
        vSwitchIds: 'vsw-123',
        vpcId: 'vpc-123',
      },
    };

    const { local: localResult, remote: resultRemote } = replaceFunction(local, remote);
    expect(localResult).toEqual(expectedLocal);
    expect(resultRemote).toEqual(expectedRemote);
  });

  it('local.vpcConifg is Object', () => {
    const local = {
      nasConfig: 'auto',
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'auto',
        securityGroupId: 'auto',
      },
      logConfig: 'auto',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
        },
        preStop: {
          handler: 'my-pre-stop',
        },
      },
      ossMountConfig: {
        mountPoints: 'test',
      },
      runtime: 'customContainer',
    };
    const remote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 60,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 30,
        },
      },
      customContainerConfig: {
        image: 'my-image',
      },
      lastUpdateStatus: 'Success',
      state: 'Running',
    };
    const expectedLocal = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 60,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 30,
        },
      },
      ossMountConfig: {
        mountPoints: 'test',
      },
      runtime: 'customContainer',
    };
    const expectedRemote = {
      customContainerConfig: {
        image: 'my-image',
      },
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 60,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 30,
        },
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      nasConfig: {
        mountPoints: [
          {
            mountDir: '/mnt/nas',
            serverAddr: 'nas-server',
          },
        ],
      },
      role: 'my-role',
      vpcConfig: {
        securityGroupId: 'sg-123',
        vSwitchIds: 'vsw-123',
        vpcId: 'vpc-123',
      },
    };

    const { local: localResult, remote: resultRemote } = replaceFunction(local, remote);
    expect(localResult).toEqual(expectedLocal);
    expect(resultRemote).toEqual(expectedRemote);
  });

  it('remote.instanceLifecycleConfig have not handler and timeout', () => {
    const local = {
      nasConfig: 'auto',
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'auto',
        securityGroupId: 'auto',
      },
      logConfig: 'auto',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
        },
        preStop: {
          handler: 'my-pre-stop',
        },
      },
      ossMountConfig: {
        mountPoints: 'test',
      },
      runtime: 'customContainer',
    };
    const remote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
        },
        preStop: {
          handler: '',
        },
      },
      customContainerConfig: {
        image: 'my-image',
      },
      lastUpdateStatus: 'Success',
      state: 'Running',
    };
    const expectedLocal = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: 'my-initializer',
          timeout: 3,
        },
        preStop: {
          handler: 'my-pre-stop',
          timeout: 3,
        },
      },
      ossMountConfig: {
        mountPoints: 'test',
      },
      runtime: 'customContainer',
    };
    const expectedRemote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
        },
        preStop: {
          handler: '',
        },
      },
      customContainerConfig: {
        image: 'my-image',
      },
    };

    const { local: localResult, remote: resultRemote } = replaceFunction(local, remote);
    expect(localResult).toEqual(expectedLocal);
    expect(resultRemote).toEqual(expectedRemote);
  });

  it('remote.instanceLifecycleConfig.handler is not false', () => {
    const local = {
      nasConfig: 'auto',
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'auto',
        securityGroupId: 'auto',
      },
      logConfig: 'auto',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
        },
        preStop: {
          handler: '',
        },
      },
      ossMountConfig: {
        mountPoints: 'test',
      },
      runtime: 'custom-container',
    };
    const remote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {
        initializer: {
          handler: '',
        },
        preStop: {
          handler: '',
        },
      },
      customContainerConfig: {
        image: 'my-image',
      },
      lastUpdateStatus: 'Success',
      state: 'Running',
    };
    const expectedLocal = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      handler: 'handler',
      role: 'my-role',
      ossMountConfig: {
        mountPoints: 'test',
      },
      instanceLifecycleConfig: {},
      runtime: 'custom-container',
    };
    const expectedRemote = {
      nasConfig: {
        mountPoints: [
          {
            serverAddr: 'nas-server',
            mountDir: '/mnt/nas',
          },
        ],
      },
      vpcConfig: {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
        securityGroupId: 'sg-123',
      },
      logConfig: {
        project: 'my-project',
        logstore: 'my-logstore',
      },
      role: 'my-role',
      instanceLifecycleConfig: {},
      customContainerConfig: {
        image: 'my-image',
      },
    };

    const { local: localResult, remote: resultRemote } = replaceFunction(local, remote);
    expect(localResult).toEqual(expectedLocal);
    expect(resultRemote).toEqual(expectedRemote);
  });
});
