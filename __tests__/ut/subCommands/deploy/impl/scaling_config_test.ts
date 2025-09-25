import ScalingConfig from '../../../../../src/subCommands/deploy/impl/scaling_config';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';

// Mocks

const getRootHomeMock = jest.requireMock('@serverless-devs/utils').getRootHome;

describe('ScalingConfig', () => {
  let mockInputs: IInputs;
  let scalingConfig: ScalingConfig;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
        Region: 'cn-hangzhou',
      },
      args: [],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;

    mockOpts = {
      yes: true,
    };

    // Setup mocks
    getRootHomeMock.mockReturnValue('/root');

    // Mock logger methods
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with scaling config', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
        horizontalScalingPolicies: [
          {
            name: 'test-policy',
            metricType: 'CPU',
            metricTarget: 70,
            minInstances: 1,
            maxInstances: 10,
          },
        ],
      };

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      expect(scalingConfig.local).toEqual({
        minInstances: 1,
        horizontalScalingPolicies: [
          {
            name: 'test-policy',
            metricType: 'CPU',
            metricTarget: 70,
            minInstances: 1,
            maxInstances: 10,
          },
        ],
      });
    });

    it('should initialize correctly without scaling config', () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      expect(scalingConfig.local).toEqual({});
    });
  });

  describe('before', () => {
    it('should call getRemote and plan', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const getRemoteSpy = jest
        .spyOn(scalingConfig as any, 'getRemote')
        .mockResolvedValue(undefined);
      const planSpy = jest.spyOn(scalingConfig as any, 'plan').mockResolvedValue(undefined);

      await scalingConfig.before();

      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should deploy scaling config when local config exists and needDeploy is true', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValue({ currentInstances: 1, minInstances: 1 }),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await scalingConfig.run();

      expect(mockFcSdk.putFunctionScalingConfig).toHaveBeenCalledWith('test-function', 'LATEST', {
        minInstances: 1,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'ScalingConfig of test-function/LATEST is ready. CurrentInstances: 1, MinInstances: 1',
      );
      expect(result).toBe(true);
    });

    it('should remove scaling config when local config is empty and needDeploy is true', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = true;
      scalingConfig.remote = { minInstances: 1 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({ currentInstances: 0 }),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await scalingConfig.run();

      expect(mockFcSdk.removeFunctionScalingConfig).toHaveBeenCalledWith('test-function', 'LATEST');
      expect(result).toBe(true);
    });

    it('should skip deployment when needDeploy is false', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = false;
      scalingConfig.remote = { minInstances: 1 }; // 模拟远端已存在配置

      // Mock fcSdk to prevent actual API calls
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await scalingConfig.run();

      expect(result).toBe(false);
      expect(mockFcSdk.putFunctionScalingConfig).not.toHaveBeenCalled();
    });
  });

  describe('getRemote', () => {
    it('should get remote scaling config successfully', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest.fn().mockResolvedValue({
          minInstances: 2,
          functionArn: 'arn:acs:fc:cn-hangzhou:123456:functions/test-function/LATEST',
        }),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).getRemote();

      expect(scalingConfig.remote).toEqual({
        minInstances: 2,
      });
    });

    it('should handle error when getting remote scaling config', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest.fn().mockRejectedValue(new Error('Network error')),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).getRemote();

      expect(scalingConfig.remote).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        'Get remote scalingConfig of  test-function error: Network error',
      );
    });
  });

  describe('plan', () => {
    it('should set needDeploy to true when remote is empty', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.remote = {};

      await (scalingConfig as any).plan();

      expect(scalingConfig.needDeploy).toBe(true);
    });

    it('should prompt user when there are differences', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 2,
      };

      scalingConfig = new ScalingConfig(mockInputs, { yes: undefined });
      scalingConfig.remote = { minInstances: 1 };

      // Mock inquirer
      const inquirer = require('inquirer');
      const promptMock = jest.spyOn(inquirer, 'prompt').mockResolvedValue({ ok: true });

      await (scalingConfig as any).plan();

      expect(promptMock).toHaveBeenCalled();
      expect(logger.write).toHaveBeenCalledWith(
        expect.stringContaining('scalingConfig was changed, please confirm before deployment'),
      );
    });
  });
});
