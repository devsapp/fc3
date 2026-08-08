import { ICredentials } from '@serverless-devs/component-interface';
import Acr from '../../../../src/resources/acr/index';
import { getDockerTmpUser, getAcrEEInstanceID, getAcrImageMeta } from '../../../../src/resources/acr/login';
import { runCommand, checkDockerIsOK, sleep } from '../../../../src/utils';

jest.mock('../../../../src/resources/acr/login', () => ({
  getDockerTmpUser: jest.fn(),
  getAcrEEInstanceID: jest.fn(),
  getAcrImageMeta: jest.fn(),
  mockDockerConfigFile: jest.fn(),
}));

jest.mock('../../../../src/utils', () => {
  const rc: any = jest.fn().mockResolvedValue(undefined);
  rc.showStdout = { inherit: 'inherit', pipe: 'pipe', ignore: 'ignore' };
  return {
    runCommand: rc,
    checkDockerIsOK: jest.fn(),
    sleep: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const ACREE_VPC = 'test-registry-vpc.cn-hangzhou.cr.aliyuncs.com/ns/repo:tag';
const ACREE_INTERNET = 'test-registry.cn-hangzhou.cr.aliyuncs.com/ns/repo:tag';
const ACR_INTERNET = 'registry.cn-hangzhou.aliyuncs.com/ns/repo:tag';
const ACR_VPC = 'registry-vpc.cn-hangzhou.aliyuncs.com/ns/repo:tag';
const NON_ACR = 'docker.io/library/nginx:latest';

const credentials: ICredentials = {
  AccountID: 'test-account-id',
  AccessKeyID: 'test-access-key-id',
  AccessKeySecret: 'test-access-key-secret',
  SecurityToken: 'test-security-token',
};

describe('Acr static helpers', () => {
  describe('isAcreeRegistry', () => {
    it('returns true for an ACR EE vpc registry url', () => {
      expect(Acr.isAcreeRegistry(ACREE_VPC)).toBe(true);
    });

    it('returns true for an ACR EE internet registry url', () => {
      expect(Acr.isAcreeRegistry(ACREE_INTERNET)).toBe(true);
    });

    it('returns false for a non-acr registry url', () => {
      expect(Acr.isAcreeRegistry(NON_ACR)).toBe(false);
    });
  });

  describe('isAcrRegistry', () => {
    it('returns true for a shared-instance acr registry', () => {
      expect(Acr.isAcrRegistry(ACR_INTERNET)).toBe(true);
    });

    it('returns true for an acr ee registry', () => {
      expect(Acr.isAcrRegistry(ACREE_VPC)).toBe(true);
    });

    it('returns false for docker hub images', () => {
      expect(Acr.isAcrRegistry(NON_ACR)).toBe(false);
    });
  });

  describe('isVpcAcrRegistry', () => {
    it('returns true for a vpc acr registry', () => {
      expect(Acr.isVpcAcrRegistry(ACR_VPC)).toBe(true);
    });

    it('returns false for an internet acr registry', () => {
      expect(Acr.isVpcAcrRegistry(ACR_INTERNET)).toBe(false);
    });

    it('returns false for a non-acr registry', () => {
      expect(Acr.isVpcAcrRegistry(NON_ACR)).toBe(false);
    });
  });

  describe('vpcImage2InternetImage', () => {
    it('rewrites a vpc acr registry to its internet counterpart', () => {
      expect(Acr.vpcImage2InternetImage(ACR_VPC)).toBe(ACR_INTERNET);
    });

    it('rewrites a vpc acr ee registry to its internet counterpart', () => {
      expect(Acr.vpcImage2InternetImage(ACREE_VPC)).toBe(ACREE_INTERNET);
    });

    it('leaves a non-vpc image unchanged', () => {
      expect(Acr.vpcImage2InternetImage(ACR_INTERNET)).toBe(ACR_INTERNET);
    });
  });
});

describe('Acr instance methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAcr', () => {
    it('resolves the instance id and returns whether the image exists', async () => {
      // Arrange
      (getAcrEEInstanceID as jest.Mock).mockResolvedValue('inst-123');
      (getAcrImageMeta as jest.Mock).mockResolvedValue(true);
      const acr = new Acr('cn-hangzhou' as any, credentials);

      // Act
      const exists = await acr.checkAcr(ACREE_INTERNET);

      // Assert
      expect(exists).toBe(true);
      // instanceName parsed from "test-registry" -> "test"
      expect(getAcrEEInstanceID).toHaveBeenCalledWith('cn-hangzhou', credentials, 'test');
      expect(getAcrImageMeta).toHaveBeenCalledWith(
        'cn-hangzhou',
        credentials,
        ACREE_INTERNET,
        'inst-123',
      );
    });
  });

  describe('pushAcr', () => {
    it('tags, logs in and pushes the image on the happy path', async () => {
      // Arrange
      (getAcrEEInstanceID as jest.Mock).mockResolvedValue('inst-123');
      (getDockerTmpUser as jest.Mock).mockResolvedValue({
        dockerTmpUser: 'tmp-user',
        dockerTmpToken: 'tmp-token',
      });
      const acr = new Acr('cn-hangzhou' as any, credentials);

      // Act
      await acr.pushAcr(ACREE_VPC);

      // Assert
      expect(checkDockerIsOK).toHaveBeenCalled();
      expect(getDockerTmpUser).toHaveBeenCalledWith('cn-hangzhou', credentials, 'inst-123');
      // vpc -> internet requires a docker tag command plus login + push
      const commands = (runCommand as unknown as jest.Mock).mock.calls.map((c) => c[0]);
      expect(commands.some((c: string) => c.startsWith('docker tag'))).toBe(true);
      expect(commands.some((c: string) => c.includes('docker login'))).toBe(true);
      expect(commands.some((c: string) => c.startsWith('docker push'))).toBe(true);
      expect(sleep).toHaveBeenCalledWith(3);
    });
  });
});
