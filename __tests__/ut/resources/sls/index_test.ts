import Sls from '../../../../src/resources/sls/index';
import { ICredentials } from '@serverless-devs/component-interface';
import logger from '../../../../src/logger';
import * as defaultResources from '../../../../src/default/resources';
import * as utils from '../../../../src/utils/index';

// Mock external dependencies
jest.mock('@serverless-cd/srm-aliyun-sls20201230');
jest.mock('@alicloud/openapi-client');
jest.mock('uuid-by-string', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue('test-uuid'),
}));
jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
}));
jest.mock('../../../../src/default/resources');
jest.mock('../../../../src/utils/index');

describe('Sls', () => {
  let mockCredentials: ICredentials;
  let sls: Sls;

  beforeEach(() => {
    mockCredentials = {
      AccountID: 'test-account-id',
      AccessKeyID: 'test-access-key-id',
      AccessKeySecret: 'test-access-key-secret',
      SecurityToken: 'test-security-token',
    };

    // Mock default resources
    (defaultResources as any).PROJECT = 'test-project';
    (defaultResources as any).LOG_STORE = 'test-logstore';

    // Mock isAppCenter
    (utils.isAppCenter as jest.Mock).mockReturnValue(false);

    sls = new Sls('cn-hangzhou', mockCredentials);
  });

  describe('generateProjectName', () => {
    it('should generate project name using PROJECT constant when available', () => {
      const projectName = Sls.generateProjectName('cn-hangzhou', 'test-account-id');
      expect(projectName).toBe('test-project');
    });

    it('should generate project name using default pattern when PROJECT is not set', () => {
      // Temporarily mock PROJECT to be null
      const originalProject = (defaultResources as any).PROJECT;
      (defaultResources as any).PROJECT = null;
      const projectName = Sls.generateProjectName('cn-hangzhou', 'test-account-id');
      // Restore original value
      (defaultResources as any).PROJECT = originalProject;
      expect(projectName).toBe('serverless-cn-hangzhou-test-uuid');
    });

    it('should truncate project name to 63 characters when it exceeds the limit', () => {
      const longProjectName = 'a'.repeat(70);
      (defaultResources as any).PROJECT = longProjectName;
      const projectName = Sls.generateProjectName('cn-hangzhou', 'test-account-id');
      expect(projectName).toBe('a'.repeat(63));
    });
  });

  describe('generateLogstoreName', () => {
    it('should return LOG_STORE constant', () => {
      const logstoreName = Sls.generateLogstoreName();
      expect(logstoreName).toBe('test-logstore');
    });
  });

  describe('constructor', () => {
    it('should create Sls instance with correct client configuration', () => {
      expect(sls).toBeDefined();
      expect((sls as any).accountID).toBe('test-account-id');
    });
  });

  describe('deploy', () => {
    it('should deploy SLS resources successfully', async () => {
      // Mock SLS client
      const mockInitSls = jest.fn().mockResolvedValue(undefined);
      (sls as any).client = { initSls: mockInitSls };

      const result = await sls.deploy();

      expect(result).toEqual({
        project: 'test-project',
        logstore: 'test-logstore',
      });

      // Check that initSls was called with a request object
      expect(mockInitSls).toHaveBeenCalled();
      const callArgs = mockInitSls.mock.calls[0];
      expect(callArgs[0]).toBeDefined();

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('init sls'));
      expect(logger.spin).toHaveBeenCalledWith('creating', 'sls', expect.any(String));
      expect(logger.spin).toHaveBeenCalledWith('created', 'sls', expect.any(String));
    });

    it('should use AppCenter logging when isAppCenter returns true', async () => {
      // Mock isAppCenter to return true
      (utils.isAppCenter as jest.Mock).mockReturnValue(true);

      // Create new SLS instance with updated mock
      const slsAppCenter = new Sls('cn-hangzhou', mockCredentials);

      // Mock SLS client
      const mockInitSls = jest.fn().mockResolvedValue(undefined);
      (slsAppCenter as any).client = { initSls: mockInitSls };

      await slsAppCenter.deploy();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('creating sls'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('created sls'));
    });
  });
});
