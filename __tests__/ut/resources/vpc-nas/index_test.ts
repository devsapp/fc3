import { ICredentials } from '@serverless-devs/component-interface';
import VpcNas from '../../../../src/resources/vpc-nas/index';
import PopClient from '@serverless-cd/srm-aliyun-pop-core';

jest.mock('@serverless-cd/srm-aliyun-pop-core', () => {
  const request = jest.fn();
  const getInitNasConfigAsFc = jest.fn();
  const getInitVpcConfigAsFc = jest.fn();
  const Client = jest
    .fn()
    .mockImplementation(() => ({ request, getInitNasConfigAsFc, getInitVpcConfigAsFc }));
  (Client as any).__mocks = { request, getInitNasConfigAsFc, getInitVpcConfigAsFc };
  return { __esModule: true, default: Client };
});

jest.mock('../../../../src/default/resources', () => ({
  VPC_AND_NAS_NAME: 'default-vpc-nas',
}));

jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const mocks = (PopClient as any).__mocks as {
  request: jest.Mock;
  getInitNasConfigAsFc: jest.Mock;
  getInitVpcConfigAsFc: jest.Mock;
};

const credentials: ICredentials = {
  AccountID: 'test-account-id',
  AccessKeyID: 'test-access-key-id',
  AccessKeySecret: 'test-access-key-secret',
  SecurityToken: 'test-security-token',
};

describe('VpcNas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('creates a nas client and a vpc client', () => {
      // Act
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Assert
      expect(vpcNas).toBeDefined();
      expect((PopClient as unknown as jest.Mock)).toHaveBeenCalledTimes(2);
    });
  });

  describe('getVpcNasRule', () => {
    it('returns the existing VpcName when the vpc already has a name', async () => {
      // Arrange
      mocks.request.mockResolvedValue({ VpcName: 'existing-vpc' });
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Act
      const rule = await vpcNas.getVpcNasRule({ vpcId: 'vpc-1' } as any);

      // Assert
      expect(rule).toBe('existing-vpc');
    });

    it('assigns a generated VpcName when the vpc name is empty', async () => {
      // Arrange
      mocks.request
        .mockResolvedValueOnce({ VpcName: '   ' })
        .mockResolvedValueOnce({ ok: true });
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Act
      const rule = await vpcNas.getVpcNasRule({ vpcId: 'vpc-2' } as any);

      // Assert
      expect(rule).toBe('VpcName-vpc-2');
      expect(mocks.request).toHaveBeenCalledTimes(2);
    });

    it('returns the default name when no vpcConfig is provided', async () => {
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);
      const rule = await vpcNas.getVpcNasRule(undefined as any);
      expect(rule).toBe('default-vpc-nas');
      expect(mocks.request).not.toHaveBeenCalled();
    });

    it('falls back to the default name when the vpc request fails', async () => {
      // Arrange
      mocks.request.mockRejectedValue(new Error('network error'));
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Act
      const rule = await vpcNas.getVpcNasRule({ vpcId: 'vpc-err' } as any);

      // Assert
      expect(rule).toBe('default-vpc-nas');
    });
  });

  describe('deploy', () => {
    it('returns the auto nas config when nasAuto is true', async () => {
      // Arrange
      const nasResult = { mountTargetDomain: 'mt', fileSystemId: 'fs' };
      mocks.getInitNasConfigAsFc.mockResolvedValue(nasResult);
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Act
      const result = await vpcNas.deploy({ nasAuto: true });

      // Assert
      expect(result).toBe(nasResult);
      expect(mocks.getInitNasConfigAsFc).toHaveBeenCalled();
      expect(mocks.getInitVpcConfigAsFc).not.toHaveBeenCalled();
    });

    it('returns a vpcConfig wrapper when nasAuto is false', async () => {
      // Arrange
      mocks.getInitVpcConfigAsFc.mockResolvedValue({
        vpcId: 'vpc-9',
        vSwitchIds: ['vsw-1'],
        securityGroupId: 'sg-1',
      });
      const vpcNas = new VpcNas('cn-hangzhou' as any, credentials);

      // Act
      const result = await vpcNas.deploy({ nasAuto: false });

      // Assert
      expect(result).toEqual({
        vpcConfig: { vpcId: 'vpc-9', vSwitchIds: ['vsw-1'], securityGroupId: 'sg-1' },
      });
      expect(mocks.getInitNasConfigAsFc).not.toHaveBeenCalled();
    });
  });
});
