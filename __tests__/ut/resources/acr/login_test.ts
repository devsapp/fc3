import { ICredentials } from '@serverless-devs/component-interface';
import {
  getDockerTmpUser,
  getAcrEEInstanceID,
  getAcrImageMeta,
  mockDockerConfigFile,
} from '../../../../src/resources/acr/login';
import fse from 'fs-extra';

jest.mock('@alicloud/pop-core', () => {
  const popRequest = jest.fn();
  const roaRequest = jest.fn();
  const Pop = jest.fn().mockImplementation(() => ({ request: popRequest }));
  const ROAClient = jest.fn().mockImplementation(() => ({ request: roaRequest }));
  return {
    __esModule: true,
    default: Pop,
    ROAClient,
    // exposed for assertions/control
    popRequest,
    roaRequest,
  };
});

jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    readJSON: jest.fn().mockResolvedValue({}),
    outputFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('string-random', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('rand'),
}));

jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const { popRequest, roaRequest } = jest.requireMock('@alicloud/pop-core');

const credentials: ICredentials = {
  AccountID: 'test-account-id',
  AccessKeyID: 'test-access-key-id',
  AccessKeySecret: 'test-access-key-secret',
  SecurityToken: 'test-security-token',
};

describe('acr/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDockerTmpUser', () => {
    it('uses the ACR EE token endpoint when an instanceID is provided', async () => {
      // Arrange
      popRequest.mockResolvedValue({ TempUsername: 'ee-user', AuthorizationToken: 'ee-token' });

      // Act
      const result = await getDockerTmpUser('cn-hangzhou' as any, credentials, 'inst-1');

      // Assert
      expect(result).toEqual({ dockerTmpUser: 'ee-user', dockerTmpToken: 'ee-token' });
      expect(popRequest).toHaveBeenCalledWith(
        'GetAuthorizationToken',
        { InstanceId: 'inst-1' },
        expect.any(Object),
      );
    });

    it('uses the shared registry token endpoint when no instanceID is provided', async () => {
      // Arrange
      roaRequest.mockResolvedValue({
        data: { tempUserName: 'shared-user', authorizationToken: 'shared-token' },
      });

      // Act
      const result = await getDockerTmpUser('cn-hangzhou' as any, credentials, '');

      // Assert
      expect(result).toEqual({ dockerTmpUser: 'shared-user', dockerTmpToken: 'shared-token' });
    });

    it('rethrows non-auth errors from the shared registry token endpoint', async () => {
      // Arrange
      roaRequest.mockRejectedValue({ statusCode: 500, message: 'boom' });

      // Act / Assert
      await expect(getDockerTmpUser('cn-hangzhou' as any, credentials, '')).rejects.toBeDefined();
    });
  });

  describe('getAcrImageMeta', () => {
    it('returns false immediately for ACR EE instances', async () => {
      const exists = await getAcrImageMeta('cn-hangzhou' as any, credentials, 'x/ns/repo:tag', 'inst-1');
      expect(exists).toBe(false);
      expect(roaRequest).not.toHaveBeenCalled();
    });

    it('returns true when the tag lookup succeeds for a shared instance', async () => {
      roaRequest.mockResolvedValue({ data: {} });
      const exists = await getAcrImageMeta(
        'cn-hangzhou' as any,
        credentials,
        'registry.cn-hangzhou.aliyuncs.com/ns/repo:tag',
        '',
      );
      expect(exists).toBe(true);
    });

    it('returns false when the tag lookup 404s', async () => {
      roaRequest.mockRejectedValue({ statusCode: 404 });
      const exists = await getAcrImageMeta(
        'cn-hangzhou' as any,
        credentials,
        'registry.cn-hangzhou.aliyuncs.com/ns/repo:tag',
        '',
      );
      expect(exists).toBe(false);
    });
  });

  describe('getAcrEEInstanceID', () => {
    it('returns undefined when no instance name is provided', async () => {
      const id = await getAcrEEInstanceID('cn-hangzhou' as any, credentials, '');
      expect(id).toBeUndefined();
    });

    it('returns the instance id for a running matching instance', async () => {
      popRequest.mockResolvedValue({
        TotalCount: 1,
        Instances: [{ InstanceName: 'my-inst', InstanceStatus: 'RUNNING', InstanceId: 'id-9' }],
      });
      const id = await getAcrEEInstanceID('cn-hangzhou' as any, credentials, 'my-inst');
      expect(id).toBe('id-9');
    });

    it('throws when the matching instance is not running', async () => {
      popRequest.mockResolvedValue({
        TotalCount: 1,
        Instances: [{ InstanceName: 'my-inst', InstanceStatus: 'STOPPED', InstanceId: 'id-9' }],
      });
      await expect(
        getAcrEEInstanceID('cn-hangzhou' as any, credentials, 'my-inst'),
      ).rejects.toThrow(/STOPPED/);
    });
  });

  describe('mockDockerConfigFile', () => {
    it('writes a base64 auth entry keyed by registry host', async () => {
      // Arrange
      popRequest.mockResolvedValue({ TempUsername: 'ee-user', AuthorizationToken: 'ee-token' });

      // Act
      await mockDockerConfigFile(
        'cn-hangzhou' as any,
        'test-registry.cn-hangzhou.cr.aliyuncs.com/ns/repo:tag',
        credentials,
        'inst-1',
      );

      // Assert
      expect(fse.outputFile).toHaveBeenCalled();
      const [, content] = (fse.outputFile as jest.Mock).mock.calls[0];
      const parsed = JSON.parse(content);
      const host = 'test-registry.cn-hangzhou.cr.aliyuncs.com';
      const expectedAuth = Buffer.from('ee-user:ee-token').toString('base64');
      expect(parsed.auths[host].auth).toBe(expectedAuth);
    });
  });
});
