import Role from '../../src/resources/ram';
import Sls from '../../src/resources/sls';
import VpcNas from '../../src/resources/vpc-nas';
import { getCustomEndpoint } from '../../src/resources/fc/impl/utils';
import replaceFunction from '../../src/resources/fc/impl/replace-function-config';
import { fc2Client } from '../../src/resources/fc/impl/client';
import Acr from '../../src/resources/acr';
import {
  getAcrEEInstanceID,
  mockDockerConfigFile,
  getAcrImageMeta,
  getDockerTmpUser,
} from '../../src/resources/acr/login';
import log from '../../src/logger';
import { IVpcConfig } from '../../src/interface';
import Pop from '@alicloud/pop-core';
import PopClient from '@serverless-cd/srm-aliyun-pop-core';
log._set(console);
const { ROAClient } = require('@alicloud/pop-core');

jest.mock('@alicloud/pop-core');
jest.mock('@serverless-cd/srm-aliyun-pop-core');

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

    test('', async () => {
      (PopClient as jest.Mock).mockImplementation(() => {
        return {
          request: jest.fn().mockResolvedValue({
            vpcId: 'test',
            vSwitchIds: 'auto',
            securityGroupId: 'test',
            VpcName: ' test ',
          }),
        };
      });
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
    expect(result).toEqual({ protocol: 'https' });
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

describe('fc2Client', () => {
  it('should return a fc2 client', () => {
    const region = 'cn-hangzhou';
    const credentials = {
      AccessKeyID: 'accessKeyID',
      AccessKeySecret: 'accessKeySecret',
      AccountID: 'accountID',
      SecurityToken: 'securityToken',
    };
    const customEndpoint = 'test';

    const result = fc2Client(region, credentials, customEndpoint);

    expect(result).toBeDefined();
  });
});

describe('Acr', () => {
  describe('isAcreeRegistry', () => {
    test('should return true when imageUrl satisfies the condition', () => {
      const imageUrl = 'my-service-registry.cn-hangzhou.cr.aliyuncs.com/aaaaa/testing-b-proxy:v1';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(true);
    });

    test('should return true when imageUrl satisfies the condition', () => {
      const imageUrl = 'my-service-registry.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:latest';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(true);
    });

    test('should return true when imageUrl satisfies the condition', () => {
      const imageUrl =
        'my-service-registry-vpc.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:latest';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(true);
    });

    test('should return false when imageUrl does not satisfies the condition', () => {
      const imageUrl = 'registry.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:latest';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(false);
    });

    test('should return false when imageUrl does not satisfy the condition', () => {
      const imageUrl = 'test.registry.cr.aliyuncs.cn';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(false);
    });

    test('should return false when imageUrl does not satisfy the condition', () => {
      const imageUrl = 'registry.cn-hangzhou.aliyuncs.com/demo/nginx:v1';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(false);
    });

    test('should return false when imageUrl does not satisfy the condition', () => {
      const imageUrl = 'registry.cn-beijing.aliyuncs.com/some-org/some-repo:latest';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(false);
    });

    test('should return false when imageUrl does not satisfy the condition', () => {
      const imageUrl = 'not-an-aliyun-registry-address';

      const result = Acr.isAcreeRegistry(imageUrl);
      expect(result).toBe(false);
    });
  });

  describe('isAcrRegistry', () => {
    test('should return false when imageUrl satisfies the condition', () => {
      const imageUrl = 'registry.cn-hangzhou.aliyuncs.com/fc-demo2/test-xiliu:ciExpressV1';

      const result = Acr.isAcrRegistry(imageUrl);
      expect(result).toBe(true);
    });
  });

  describe('isVpcAcrRegistry', () => {
    test('should return true when imageUrl satisfy the condition', () => {
      const imageUrl = 'registry-vpc.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:latest';

      const result = Acr.isVpcAcrRegistry(imageUrl);
      expect(result).toBe(true);
    });

    test('should return true when imageUrl satisfy the condition', () => {
      const imageUrl =
        'my-service-registry-vpc.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:latest';

      const result = Acr.isVpcAcrRegistry(imageUrl);
      expect(result).toBe(true);
    });

    test('should return true when imageUrl does not satisfy the condition', () => {
      const imageUrl = 'registry-vpc/test/path';

      const result = Acr.isVpcAcrRegistry(imageUrl);
      expect(result).toBe(false);
    });

    test('should return false when imageUrl not satisfy the condition', () => {
      const imageUrl = 'registry/test/path';

      const result = Acr.isVpcAcrRegistry(imageUrl);
      expect(result).toBe(false);
    });
  });

  describe('vpcImage2InternetImage', () => {
    test('should return the correct imageUrl', () => {
      const imageUrl = 'my-service-registry-vpc.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:v1';

      const result = Acr.vpcImage2InternetImage(imageUrl);
      expect(result).toBe('my-service-registry.cn-hangzhou.cr.aliyuncs.com/my-service/my-image:v1');
    });

    test('should return the correct imageUrl,and replace registry-vpc', () => {
      const imageUrl = 'registry-vpc.cn-hangzhou.cr.aliyuncs.com/test/my-image:v1';

      const result = Acr.vpcImage2InternetImage(imageUrl);
      expect(result).toBe('registry.cn-hangzhou.cr.aliyuncs.com/test/my-image:v1');
    });
  });

  describe('getAcrEEInstanceID', () => {
    test('should return the correct instanceID', async () => {
      const imageUrl = 'test.cn-hangzhou.aliyuncs.com/test/path';
      const credential = {
        AccountID: '123456789',
        AccessKeyID: 'test',
        AccessKeySecret: 'test',
        SecurityToken: 'test',
      };

      const result = await Acr.getAcrEEInstanceID(imageUrl, credential);
      expect(result).toBe(undefined);
    });
  });
  let acr;
  const region = 'cn-hangzhou';
  const credential = {
    AccountID: '123456789',
    AccessKeyID: 'test',
    AccessKeySecret: 'test',
    SecurityToken: 'test',
  };
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    acr = new Acr(region, credential);
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
    jest.clearAllMocks();
  });

  describe('checkAcr', () => {
    test('should return false when instanceID is null', async () => {
      (ROAClient as jest.Mock).mockImplementation(() => {
        return {
          request: jest.fn().mockImplementation(() => {
            throw new Error('instanceID is null');
          }),
        };
      });
      const imageUrl = 'test.cn-hangzhou.aliyuncs.com/test/path';

      const result = await acr.checkAcr(imageUrl);
      expect(result).toBe(false);
    });
  });
});

describe('mockDockerConfigFile', () => {
  test('test mockDockerConfigFile ran successfully', async () => {
    (Pop as jest.Mock).mockImplementation(() => ({
      request: async () => {
        return Promise.resolve({
          TempUserName: 'testName',
          AuthorizationToken: 'testToken',
        });
      },
    }));
    const region = 'cn-hangzhou';
    const imageName = 'test.com/test/test:test';
    const credentials = {
      AccountID: 'testAccountID',
      AccessKeyID: 'testAccessKeyID',
      AccessKeySecret: 'testAccessKeySecret',
      SecurityToken: 'testSecurityToken',
    };
    const instanceID = 'test';

    const result = await mockDockerConfigFile(region, imageName, credentials, instanceID);
    expect(result).toBe(undefined);
  });
});

describe('getAcrEEInstanceID', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  test('should throw error when InstanceStatus is not RUNNING', () => {
    (Pop as jest.Mock).mockImplementation(() => ({
      request: async () =>
        Promise.resolve({
          TotalCoint: 1,
          Instances: [
            {
              InstanceID: 'test',
              InstanceName: 'test',
              RegionID: 'cn-hangzhou',
              InstanceStatus: 'Running',
              CreationTime: '2021-01-01T00:00:00Z',
              ModificationTime: '2021-01-01T00:00:00Z',
            },
          ],
        }),
    }));
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const instanceName = 'test';

    expect(async () => {
      await getAcrEEInstanceID(region, credentials, instanceName);
    }).rejects.toThrowError('AcrEE test Status is Running');
  });

  test('should return instanceId when InstanceStatus is RUNNING', async () => {
    (Pop as jest.Mock).mockImplementation(() => ({
      request: async () =>
        Promise.resolve({
          TotalCoint: 1,
          Instances: [
            {
              InstanceId: 'test',
              InstanceName: 'test',
              RegionID: 'cn-hangzhou',
              InstanceStatus: 'RUNNING',
              CreationTime: '2021-01-01T00:00:00Z',
              ModificationTime: '2021-01-01T00:00:00Z',
            },
          ],
        }),
    }));
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const instanceName = 'test';

    const result = await getAcrEEInstanceID(region, credentials, instanceName);
    expect(result).toBe('test');
  });

  test('should return null string when InstanceName and instanceName are not equal', async () => {
    (Pop as jest.Mock).mockImplementation(() => ({
      request: async () =>
        Promise.resolve({
          TotalCount: 1,
          Instances: [
            {
              InstanceId: 'test',
              InstanceName: 'test1',
              RegionID: 'cn-hangzhou',
              InstanceStatus: 'RUNNING',
              CreationTime: '2021-01-01T00:00:00Z',
              ModificationTime: '2021-01-01T00:00:00Z',
            },
          ],
        }),
    }));
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const instanceName = 'test';

    const result = await getAcrEEInstanceID(region, credentials, instanceName);
    expect(result).toBe('');
  });
});

describe('getAcrImageMeta', () => {
  test('should return false when instanceID is test', async () => {
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const imageUrl = 'test';
    const instanceID = 'test';

    const result = await getAcrImageMeta(region, credentials, imageUrl, instanceID);
    expect(result).toBe(false);
  });

  test('should return false when request return error', async () => {
    (ROAClient as jest.Mock).mockImplementation(() => {
      return {
        request: () =>
          Promise.reject(
            new Error(
              JSON.stringify({
                statusCode: 404,
              }),
            ),
          ),
      };
    });
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const imageUrl = 'test/test/test:test';
    const instanceID = '';

    const result = await getAcrImageMeta(region, credentials, imageUrl, instanceID);
    expect(result).toBe(false);
  });

  test('should return true', async () => {
    (ROAClient as jest.Mock).mockImplementation(() => {
      return {
        request: () =>
          Promise.resolve({
            data: {
              isExist: true,
            },
          }),
      };
    });
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const imageUrl = 'test/test/test:test';
    const instanceID = '';

    const result = await getAcrImageMeta(region, credentials, imageUrl, instanceID);
    expect(result).toBe(true);
  });
});

describe('getAuthorizationTokenOfRegisrty and createUserInfo', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  test('should throw error when code is not USER_NOT_EXIST', () => {
    (ROAClient as jest.Mock).mockImplementation(() => {
      return {
        request: async () => {
          throw new Error(
            JSON.stringify({
              code: 404,
            }),
          );
        },
      };
    });
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    expect(async () => {
      await getDockerTmpUser(region, credentials, '');
    }).rejects.toThrowError(
      JSON.stringify({
        code: 404,
      }),
    );
  });

  test('should dockerTmpConfig returned success', async () => {
    (ROAClient as jest.Mock).mockImplementation(() => ({
      request: jest.fn(() => {
        if (!count) {
          count = 1;
          return Promise.reject(mockRejectedValue);
        } else {
          return Promise.resolve(mockResolvedValue);
        }
      }),
    }));
    var count = 0;
    var mockRejectedValue = {
      result: {
        code: 'USER_NOT_EXIST',
      },
    };
    var mockResolvedValue = {
      data: {
        tempUserName: 'test',
        authorizationToken: 'test',
      },
    };
    const region = 'cn-hangzhou';
    const credentials = {
      AccountID: 'test',
      AccessKeyID: 'test',
      AccessKeySecret: 'test',
      SecurityToken: 'test',
    };
    const result = await getDockerTmpUser(region, credentials, '');
    expect(result).toStrictEqual({
      dockerTmpUser: 'test',
      dockerTmpToken: 'test',
    });
  });
});
