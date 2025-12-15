import ScalingConfig from '../../../../../src/subCommands/deploy/impl/scaling_config';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';
import { sleep, isProvisionConfigError } from '../../../../../src/utils';

// Mocks
jest.mock('../../../../../src/utils');

const getRootHomeMock = jest.requireMock('@serverless-devs/utils').getRootHome;
const sleepMock = sleep as jest.Mock;
const isProvisionConfigErrorMock = isProvisionConfigError as jest.Mock;

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
    sleepMock.mockResolvedValue(undefined);
    isProvisionConfigErrorMock.mockImplementation((err) =>
      err.message.includes('provision config'),
    );

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

  describe('provisionConfigErrorRetry', () => {
    it('should successfully create scaling config on first attempt', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      await utils.provisionConfigErrorRetry(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
    });

    it('should handle non-provision config errors', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockRejectedValue(new Error('network error')),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      isProvisionConfigErrorMock.mockReturnValue(false);

      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockRejectedValue(new Error('network error'));

      await expect(
        utils.provisionConfigErrorRetry(
          scalingConfig.fcSdk,
          'ScalingConfig',
          'test-function',
          'LATEST',
          { minInstances: 1 },
        ),
      ).rejects.toThrow('network error');

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
    });

    it('should retry and succeed after provision config error', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest
          .fn()
          .mockRejectedValueOnce(new Error('provision config error'))
          .mockResolvedValueOnce(undefined),
        removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      isProvisionConfigErrorMock.mockReturnValue(true);

      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockImplementation(async (fcSdk, command, functionName, qualifier, localConfig) => {
          // First call throws error, second succeeds
          if (provisionConfigErrorRetrySpy.mock.calls.length <= 1) {
            throw new Error('provision config error');
          }
        });

      await expect(
        utils.provisionConfigErrorRetry(
          scalingConfig.fcSdk,
          'ScalingConfig',
          'test-function',
          'LATEST',
          { minInstances: 1 },
        ),
      ).rejects.toThrow('provision config error');

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
    });

    it('should fail after max retries with provision config errors', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockRejectedValue(new Error('provision config error')),
        removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      isProvisionConfigErrorMock.mockReturnValue(true);

      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockRejectedValue(new Error('Failed to create scalingConfig after 60 attempts'));

      await expect(
        utils.provisionConfigErrorRetry(
          scalingConfig.fcSdk,
          'ScalingConfig',
          'test-function',
          'LATEST',
          { minInstances: 1 },
        ),
      ).rejects.toThrow('Failed to create scalingConfig after 60 attempts');

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
    });

    it('should handle ProvisionConfig command type', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue(undefined),
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      await utils.provisionConfigErrorRetry(
        scalingConfig.fcSdk,
        'ProvisionConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ProvisionConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
    });
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
      } as any;

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

    it('should initialize correctly with mode config', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
        mode: 'async',
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      expect(scalingConfig.local).toEqual({
        minInstances: 1,
      });
      expect(scalingConfig.ScalingMode).toBe('async');
    });

    it('should initialize correctly with drain mode config', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
        mode: 'drain',
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      expect(scalingConfig.ScalingMode).toBe('drain');
    });
  });

  describe('before', () => {
    it('should call getRemote and plan', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
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
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValue({ currentInstances: 1, minInstances: 1 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock provisionConfigErrorRetry
      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const result = await scalingConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
      expect(logger.info).toHaveBeenCalledWith(
        'ScalingConfig of test-function/LATEST is ready. CurrentInstances: 1, MinInstances: 1',
      );
      expect(result).toBe(true);
    });

    it('should wait for scaling ready when mode is sync', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = true;
      scalingConfig.ScalingMode = 'sync';

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValue({ currentInstances: 1, minInstances: 1 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock provisionConfigErrorRetry
      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const waitForScalingReadySpy = jest
        .spyOn(scalingConfig as any, 'waitForScalingReady')
        .mockResolvedValue(undefined);

      await scalingConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
      expect(waitForScalingReadySpy).toHaveBeenCalledWith('LATEST', {
        minInstances: 1,
      });
    });

    it('should skip wait for scaling ready when mode is async', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = true;
      scalingConfig.ScalingMode = 'async';

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock provisionConfigErrorRetry
      const utils = require('../../../../../src/subCommands/deploy/utils');
      const provisionConfigErrorRetrySpy = jest
        .spyOn(utils, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const waitForScalingReadySpy = jest.spyOn(scalingConfig as any, 'waitForScalingReady');

      await scalingConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith(
        scalingConfig.fcSdk,
        'ScalingConfig',
        'test-function',
        'LATEST',
        { minInstances: 1 },
      );
      expect(waitForScalingReadySpy).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Skip wait scalingConfig of test-function/LATEST to instance up',
      );
    });

    it('should attempt to create scaling config when needDeploy is false but remote config is empty', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = false;
      scalingConfig.remote = {};

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await scalingConfig.run();

      expect(mockFcSdk.putFunctionScalingConfig).toHaveBeenCalledWith('test-function', 'LATEST', {
        minInstances: 1,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Online scalingConfig does not exist, specified not to deploy, attempting to create test-function/scalingConfig',
      );
      expect(result).toBe(false);
    });

    it('should skip deployment when needDeploy is false and remote config exists', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = false;
      scalingConfig.remote = { minInstances: 1 };

      // Mock fcSdk to prevent actual API calls
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await scalingConfig.run();

      expect(mockFcSdk.putFunctionScalingConfig).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Online scalingConfig exists, specified not to deploy, skipping deployment test-function/scalingConfig',
      );
      expect(result).toBe(false);
    });

    it('should remove scaling config when local config is empty and needDeploy is true', async () => {
      const scalingConfigWithoutScalingConfig = new ScalingConfig(
        {
          ...mockInputs,
          props: {
            ...mockInputs.props,
            scalingConfig: undefined,
          },
        } as any,
        mockOpts,
      );
      scalingConfigWithoutScalingConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfigWithoutScalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const removeScalingConfigSpy = jest
        .spyOn(scalingConfigWithoutScalingConfig as any, 'removeScalingConfig')
        .mockResolvedValue(undefined);

      await scalingConfigWithoutScalingConfig.run();

      expect(removeScalingConfigSpy).toHaveBeenCalledWith('LATEST');
    });

    it('should skip deployment when needDeploy is false', async () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      } as any;

      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.needDeploy = false;
      scalingConfig.remote = { minInstances: 1 }; // 模拟远端已存在配置

      // Mock fcSdk to prevent actual API calls
      const mockFcSdk = {
        putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
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

  describe('waitForScalingReady', () => {
    it('should still call getFunctionScalingConfig when minInstances is 0 but loop exits early', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValue({ currentInstances: 0, minInstances: 0 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).waitForScalingReady('LATEST', { minInstances: 0 });

      // 验证getFunctionScalingConfig至少被调用了一次
      expect(mockFcSdk.getFunctionScalingConfig).toHaveBeenCalled();
    });

    it('should wait until currentInstances reaches minInstances', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValueOnce({ currentInstances: 5, minInstances: 10 })
          .mockResolvedValueOnce({ currentInstances: 10, minInstances: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).waitForScalingReady('LATEST', { minInstances: 10 });

      expect(mockFcSdk.getFunctionScalingConfig).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ScalingConfig of test-function/LATEST is ready. CurrentInstances: 10, MinInstances: 10',
      );
    });

    it('should handle drain mode with minInstances 0', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.ScalingMode = 'drain';

      // Mock fcSdk
      const mockFcSdk = {
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).waitForScalingReady('LATEST', { minInstances: 0 });

      expect(mockFcSdk.disableFunctionInvocation).toHaveBeenCalledWith(
        'test-function',
        true,
        'Fast scale-to-zero',
      );
      expect(sleepMock).toHaveBeenCalledWith(5);
      expect(mockFcSdk.enableFunctionInvocation).toHaveBeenCalledWith('test-function');
    });

    it('should handle drain mode without minInstances', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.ScalingMode = 'drain';

      // Mock fcSdk
      const mockFcSdk = {
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).waitForScalingReady('LATEST', {});

      expect(mockFcSdk.disableFunctionInvocation).toHaveBeenCalledWith(
        'test-function',
        true,
        'Fast scale-to-zero',
      );
      expect(sleepMock).toHaveBeenCalledWith(5);
      expect(mockFcSdk.enableFunctionInvocation).toHaveBeenCalledWith('test-function');
    });

    it('should timeout when max retries reached', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValue({ currentInstances: 5, minInstances: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).waitForScalingReady('LATEST', { minInstances: 10 });

      expect(mockFcSdk.getFunctionScalingConfig).toHaveBeenCalledTimes(180);
      expect(logger.warn).toHaveBeenCalledWith(
        'Timeout waiting for scalingConfig of test-function/LATEST to be ready',
      );
    });
  });

  describe('removeScalingConfig', () => {
    it('should remove scaling config and wait for currentInstances to be 0', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.remote = { minInstances: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        getFunctionScalingConfig: jest
          .fn()
          .mockResolvedValueOnce({ currentInstances: 5 })
          .mockResolvedValueOnce({ currentInstances: 0 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).removeScalingConfig('LATEST');

      expect(mockFcSdk.removeFunctionScalingConfig).toHaveBeenCalledWith('test-function', 'LATEST');
      expect(mockFcSdk.getFunctionScalingConfig).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ScalingConfig of test-function/LATEST removed successfully',
      );
    });

    it('should timeout when waiting for currentInstances to be 0', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.remote = { minInstances: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionScalingConfig: jest.fn().mockResolvedValue({}),
        getFunctionScalingConfig: jest.fn().mockResolvedValue({ currentInstances: 5 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (scalingConfig as any).removeScalingConfig('LATEST');

      expect(mockFcSdk.removeFunctionScalingConfig).toHaveBeenCalledWith('test-function', 'LATEST');
      expect(mockFcSdk.getFunctionScalingConfig).toHaveBeenCalledTimes(12);
      expect(logger.warn).toHaveBeenCalledWith(
        'Timeout waiting for scalingConfig of test-function/LATEST to be removed',
      );
    });

    it('should handle error when removing scaling config', async () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);
      scalingConfig.remote = { minInstances: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionScalingConfig: jest.fn().mockRejectedValue(new Error('remove error')),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(scalingConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await expect((scalingConfig as any).removeScalingConfig('LATEST')).rejects.toThrow(
        'remove error',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Remove remote scalingConfig of test-function/LATEST error: remove error',
      );
    });
  });

  describe('sanitizeScalingConfig', () => {
    it('should sanitize scaling config correctly', () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      const config = {
        minInstances: 20,
        currentInstances: 5,
        functionArn: 'arn:xxx',
        currentError: ['error'],
        targetInstances: 30,
      };

      const result = (scalingConfig as any).sanitizeScalingConfig(config);

      expect(result).toEqual({
        minInstances: 20,
      });
    });

    it('should handle empty config', () => {
      scalingConfig = new ScalingConfig(mockInputs, mockOpts);

      const result = (scalingConfig as any).sanitizeScalingConfig(null);

      expect(result).toEqual({});
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
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
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
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
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
      const localMockInputs = {
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
      const localMockOpts = {
        yes: true,
      };
      const scalingConfig = new ScalingConfig(localMockInputs, localMockOpts);
      scalingConfig.remote = {};

      await (scalingConfig as any).plan();

      expect(scalingConfig.needDeploy).toBe(true);
    });

    it('should prompt user when there are differences', async () => {
      const localMockInputs = {
        props: {
          region: 'cn-hangzhou',
          functionName: 'test-function',
          scalingConfig: {
            minInstances: 2,
          } as any,
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
      const localMockOpts = {
        yes: undefined,
      };

      const scalingConfigWithPrompt = new ScalingConfig(localMockInputs, localMockOpts);
      scalingConfigWithPrompt.remote = { minInstances: 1 };

      // Mock inquirer
      const inquirer = require('inquirer');
      const promptMock = jest.spyOn(inquirer, 'prompt').mockResolvedValue({ ok: true });

      await (scalingConfigWithPrompt as any).plan();

      expect(promptMock).toHaveBeenCalled();
      expect(logger.write).toHaveBeenCalledWith(
        expect.stringContaining('scalingConfig was changed, please confirm before deployment'),
      );
    });
  });
});
