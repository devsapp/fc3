import OSS from '../../../src/resources/oss';
import { ICredentials } from '@serverless-devs/component-interface';
import logger from '../../../src/logger';
import * as utils from '../../../src/utils';

// Mocks
jest.mock('@serverless-cd/srm-aliyun-oss', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});
jest.mock('../../../src/logger');
jest.mock('../../../src/utils');

const OssMock = jest.requireMock('@serverless-cd/srm-aliyun-oss').default;
const isAppCenterMock = utils.isAppCenter as jest.Mock;

describe('OSS', () => {
  let mockCredentials: ICredentials;
  let oss: OSS;

  beforeEach(() => {
    mockCredentials = {
      AccountID: 'test-account-id',
      AccessKeyID: 'test-access-key-id',
      AccessKeySecret: 'test-access-key-secret',
      SecurityToken: 'test-security-token',
    } as ICredentials;

    // Setup mocks
    isAppCenterMock.mockReturnValue(false);

    // Mock logger methods
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.spin = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with credentials and endpoint', () => {
      const region = 'cn-hangzhou';
      const ossEndpoint = 'https://oss-cn-hangzhou.aliyuncs.com';

      oss = new OSS(region, mockCredentials, ossEndpoint);

      expect(oss.client).toBeDefined();
    });
  });

  describe('deploy', () => {
    it('should deploy OSS resource and return ossBucket', async () => {
      const region = 'cn-hangzhou';
      const ossEndpoint = 'https://oss-cn-hangzhou.aliyuncs.com';
      const expectedOssBucket = 'test-oss-bucket';

      // Mock Oss client
      const mockClient = {
        initOss: jest.fn().mockResolvedValue({ ossBucket: expectedOssBucket }),
      };
      OssMock.mockImplementation(() => mockClient);

      oss = new OSS(region, mockCredentials, ossEndpoint);

      const result = await oss.deploy();

      expect(mockClient.initOss).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({ ossBucket: expectedOssBucket });
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('init oss:'));
      expect(logger.spin).toHaveBeenCalledWith(
        'creating',
        'oss',
        `region: ${region}; ossBucket: ${expectedOssBucket}`,
      );
    });

    it('should log info message when isAppCenter returns true', async () => {
      const region = 'cn-hangzhou';
      const ossEndpoint = 'https://oss-cn-hangzhou.aliyuncs.com';
      const expectedOssBucket = 'test-oss-bucket';

      // Mock isAppCenter to return true
      isAppCenterMock.mockReturnValue(true);

      // Mock Oss client
      const mockClient = {
        initOss: jest.fn().mockResolvedValue({ ossBucket: expectedOssBucket }),
      };
      OssMock.mockImplementation(() => mockClient);

      oss = new OSS(region, mockCredentials, ossEndpoint);

      await oss.deploy();

      expect(mockClient.initOss).toHaveBeenCalledWith(expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith(`created oss region: ${region};`);
    });
  });
});
