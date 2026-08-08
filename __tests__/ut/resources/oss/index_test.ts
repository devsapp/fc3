import { ICredentials } from '@serverless-devs/component-interface';
import OSS from '../../../../src/resources/oss/index';
import * as utils from '../../../../src/utils/index';

// Shared mock for the OSS SDK client instance method
const mockInitOss = jest.fn();

jest.mock('@serverless-cd/srm-aliyun-oss', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    initOss: mockInitOss,
  })),
}));

jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

jest.mock('../../../../src/utils/index');

import logger from '../../../../src/logger';

describe('OSS', () => {
  let credentials: ICredentials;

  beforeEach(() => {
    jest.clearAllMocks();
    credentials = {
      AccountID: 'test-account-id',
      AccessKeyID: 'test-access-key-id',
      AccessKeySecret: 'test-access-key-secret',
      SecurityToken: 'test-security-token',
    };
    (utils.isAppCenter as jest.Mock).mockReturnValue(false);
  });

  describe('constructor', () => {
    it('sets the client config from region, credentials and endpoint', () => {
      // Act
      const oss = new OSS('cn-hangzhou' as any, credentials, 'oss-cn-hangzhou.aliyuncs.com');

      // Assert
      const config = (oss as any).config;
      expect(config.accountID).toBe('test-account-id');
      expect(config.accessKeyId).toBe('test-access-key-id');
      expect(config.accessKeySecret).toBe('test-access-key-secret');
      expect(config.securityToken).toBe('test-security-token');
      expect(config.endpoint).toBe('oss-cn-hangzhou.aliyuncs.com');
      expect(config.regionId).toBe('cn-hangzhou');
    });
  });

  describe('deploy', () => {
    it('returns the full result when initOss provides all fields', async () => {
      // Arrange
      mockInitOss.mockResolvedValue({
        ossBucket: 'my-bucket',
        readOnly: true,
        mountDir: '/custom/mount',
        bucketPath: '/data',
      });
      const oss = new OSS('cn-hangzhou' as any, credentials, 'endpoint');

      // Act
      const result = await oss.deploy();

      // Assert
      expect(result).toEqual({
        ossBucket: 'my-bucket',
        readOnly: true,
        mountDir: '/custom/mount',
        bucketPath: '/data',
      });
      expect(mockInitOss).toHaveBeenCalledWith((oss as any).config, 'auto');
    });

    it('applies defaults when initOss returns only the bucket', async () => {
      // Arrange
      mockInitOss.mockResolvedValue({ ossBucket: 'bucket-x' });
      const oss = new OSS('cn-hangzhou' as any, credentials, 'endpoint');

      // Act
      const result = await oss.deploy();

      // Assert
      expect(result).toEqual({
        ossBucket: 'bucket-x',
        readOnly: false,
        mountDir: '/mnt/bucket-x',
        bucketPath: '/',
      });
    });

    it('applies defaults when initOss returns nothing', async () => {
      // Arrange
      mockInitOss.mockResolvedValue(undefined);
      const oss = new OSS('cn-hangzhou' as any, credentials, 'endpoint');

      // Act
      const result = await oss.deploy();

      // Assert
      expect(result).toEqual({
        ossBucket: '',
        readOnly: false,
        mountDir: '/mnt/',
        bucketPath: '/',
      });
    });

    it('logs via logger.info in the AppCenter branch', async () => {
      // Arrange
      (utils.isAppCenter as jest.Mock).mockReturnValue(true);
      mockInitOss.mockResolvedValue({ ossBucket: 'bucket-y' });
      const oss = new OSS('cn-shanghai' as any, credentials, 'endpoint');

      // Act
      await oss.deploy();

      // Assert
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('created oss region'));
      expect(logger.spin).not.toHaveBeenCalled();
    });

    it('logs via logger.spin when not in AppCenter', async () => {
      // Arrange
      (utils.isAppCenter as jest.Mock).mockReturnValue(false);
      mockInitOss.mockResolvedValue({ ossBucket: 'bucket-z' });
      const oss = new OSS('cn-beijing' as any, credentials, 'endpoint');

      // Act
      await oss.deploy();

      // Assert
      expect(logger.spin).toHaveBeenCalledWith(
        'creating',
        'oss',
        expect.stringContaining('bucket-z'),
      );
    });
  });
});
