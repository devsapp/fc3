import ProvisionConfig from '../../../../../src/subCommands/deploy/impl/provision_config';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';
import { sleep } from '../../../../../src/utils';

// Mocks
jest.mock('../../../../../src/utils');

const sleepMock = sleep as jest.Mock;

describe('ProvisionConfig', () => {
  let mockInputs: IInputs;
  let provisionConfig: ProvisionConfig;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        provisionConfig: {
          defaultTarget: 10,
          alwaysAllocateCPU: false,
          alwaysAllocateGPU: false,
          scheduledActions: [],
          targetTrackingPolicies: [],
        },
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
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
    sleepMock.mockResolvedValue(undefined);

    // Mock logger methods
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn(); // 添加write方法的mock
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with provision config', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      expect(provisionConfig.functionName).toBe('test-function');
      expect(provisionConfig.local).toEqual({
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
      expect(provisionConfig.ProvisionMode).toBe('sync');
    });

    it('should initialize correctly with mode config', () => {
      const inputsWithMode = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          provisionConfig: {
            defaultTarget: 10,
            alwaysAllocateCPU: false,
            alwaysAllocateGPU: false,
            scheduledActions: [],
            targetTrackingPolicies: [],
            mode: 'async',
          },
        },
      };

      provisionConfig = new ProvisionConfig(inputsWithMode, mockOpts);

      expect(provisionConfig.functionName).toBe('test-function');
      expect(provisionConfig.local).toEqual({
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
      expect(provisionConfig.ProvisionMode).toBe('async');
    });
  });

  describe('before', () => {
    it('should call getRemote and plan', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      // Use a different approach to test private methods indirectly
      const getRemoteSpy = jest
        .spyOn(provisionConfig as any, 'getRemote')
        .mockResolvedValue(Promise.resolve());
      const planSpy = jest
        .spyOn(provisionConfig as any, 'plan')
        .mockResolvedValue(Promise.resolve());

      await provisionConfig.before();

      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should put function provision config when needDeploy is true and local config is not empty', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock scalingConfig.provisionConfigErrorRetry
      const provisionConfigErrorRetrySpy = jest
        .spyOn(provisionConfig.scalingConfig, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const result = await provisionConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith('ProvisionConfig', 'LATEST', {
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
      expect(result).toBe(true);
    });

    it('should wait for provision ready when mode is sync', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.needDeploy = true;
      provisionConfig.ProvisionMode = 'sync';

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({ current: 10, target: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock scalingConfig.provisionConfigErrorRetry
      const provisionConfigErrorRetrySpy = jest
        .spyOn(provisionConfig.scalingConfig, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const waitForProvisionReadySpy = jest
        .spyOn(provisionConfig as any, 'waitForProvisionReady')
        .mockResolvedValue(undefined);

      await provisionConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith('ProvisionConfig', 'LATEST', {
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
      expect(waitForProvisionReadySpy).toHaveBeenCalledWith('LATEST', {
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
    });

    it('should skip wait for provision ready when mode is async', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.needDeploy = true;
      provisionConfig.ProvisionMode = 'async';

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock scalingConfig.provisionConfigErrorRetry
      const provisionConfigErrorRetrySpy = jest
        .spyOn(provisionConfig.scalingConfig, 'provisionConfigErrorRetry')
        .mockResolvedValue(undefined);

      const waitForProvisionReadySpy = jest.spyOn(provisionConfig as any, 'waitForProvisionReady');

      await provisionConfig.run();

      expect(provisionConfigErrorRetrySpy).toHaveBeenCalledWith('ProvisionConfig', 'LATEST', {
        defaultTarget: 10,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      });
      expect(waitForProvisionReadySpy).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        `Skip wait provisionConfig of ${provisionConfig.functionName}/LATEST to instance up`,
      );
    });

    it('should attempt to create provision config when needDeploy is false but remote config is empty', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.needDeploy = false;
      provisionConfig.remote = {};

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await provisionConfig.run();

      expect(provisionConfig.fcSdk.putFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        {
          defaultTarget: 10,
          alwaysAllocateCPU: false,
          alwaysAllocateGPU: false,
          scheduledActions: [],
          targetTrackingPolicies: [],
        },
      );
      expect(result).toBe(false);
    });

    it('should skip deployment when needDeploy is false and remote config exists', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.needDeploy = false;
      provisionConfig.remote = { defaultTarget: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn(),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await provisionConfig.run();

      expect(provisionConfig.fcSdk.putFunctionProvisionConfig).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should remove provision config when local config is empty and needDeploy is true', async () => {
      const inputsWithoutProvisionConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          provisionConfig: undefined,
        },
      };

      provisionConfig = new ProvisionConfig(inputsWithoutProvisionConfig, mockOpts);
      provisionConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        removeFunctionProvisionConfig: jest.fn().mockResolvedValue(undefined),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const removeProvisionConfigSpy = jest
        .spyOn(provisionConfig as any, 'removeProvisionConfig')
        .mockResolvedValue(undefined);

      await provisionConfig.run();

      expect(removeProvisionConfigSpy).toHaveBeenCalledWith('LATEST');
    });
  });

  describe('waitForProvisionReady', () => {
    it('should return immediately when target is 0', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest.fn(),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 0 });

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).not.toHaveBeenCalled();
    });

    it('should wait until current equals target', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest
          .fn()
          .mockResolvedValueOnce({ current: 5, target: 10 })
          .mockResolvedValueOnce({ current: 10, target: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 });

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ProvisionConfig of test-function/LATEST is ready. Current: 10, Target: 10',
      );
    });

    it('should throw error when currentError occurs and is not internal error', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({
          current: 5,
          target: 10,
          currentError: ['some error'],
        }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await expect(
        (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 }),
      ).rejects.toThrow('get test-function/LATEST provision config error: some error');
    });

    it('should continue when currentError is internal error', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest
          .fn()
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['an internal error has occurred'],
          })
          .mockResolvedValueOnce({ current: 10, target: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 });

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ProvisionConfig of test-function/LATEST is ready. Current: 10, Target: 10',
      );
    });

    it('should timeout when max retries reached', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({ current: 5, target: 10 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 });

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(180);
      expect(logger.warn).toHaveBeenCalledWith(
        'Timeout waiting for provisionConfig of test-function/LATEST to be ready',
      );
    });

    it('should handle drain mode with target 0', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.ProvisionMode = 'drain';

      // Mock fcSdk
      const mockFcSdk = {
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 0 });

      expect(provisionConfig.fcSdk.disableFunctionInvocation).toHaveBeenCalledWith(
        'test-function',
        true,
        'Fast scale-to-zero',
      );
      expect(sleepMock).toHaveBeenCalledWith(5);
      expect(provisionConfig.fcSdk.enableFunctionInvocation).toHaveBeenCalledWith('test-function');
    });

    it('should handle drain mode with defaultTarget 0', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.ProvisionMode = 'drain';

      // Mock fcSdk
      const mockFcSdk = {
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { defaultTarget: 0 });

      expect(provisionConfig.fcSdk.disableFunctionInvocation).toHaveBeenCalledWith(
        'test-function',
        true,
        'Fast scale-to-zero',
      );
      expect(sleepMock).toHaveBeenCalledWith(5);
      expect(provisionConfig.fcSdk.enableFunctionInvocation).toHaveBeenCalledWith('test-function');
    });

    it('should handle error retries in waitForProvisionReady', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest
          .fn()
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          }),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await expect(
        (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 }),
      ).rejects.toThrow('get test-function/LATEST provision config error: some error');

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(4);
      expect(logger.error).toHaveBeenCalledWith(
        'get test-function/LATEST provision config getCurrentErrorCount=4',
      );
    });

    it('should handle error retries with limited attempts in waitForProvisionReady', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest
          .fn()
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 5,
            target: 10,
            currentError: ['some error'],
          })
          .mockResolvedValueOnce({
            current: 10,
            target: 10,
          }),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).waitForProvisionReady('LATEST', { target: 10 });

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(5);
      expect(logger.info).toHaveBeenCalledWith(
        'ProvisionConfig of test-function/LATEST is ready. Current: 10, Target: 10',
      );
    });
  });

  describe('removeProvisionConfig', () => {
    it('should remove provision config and wait for current to be 0', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.remote = { target: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest
          .fn()
          .mockResolvedValueOnce({ current: 5 })
          .mockResolvedValueOnce({ current: 0 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).removeProvisionConfig('LATEST');

      expect(provisionConfig.fcSdk.removeFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'ProvisionConfig of test-function/LATEST removed successfully',
      );
    });

    it('should timeout when waiting for current to be 0', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.remote = { target: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({ current: 5 }),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).removeProvisionConfig('LATEST');

      expect(provisionConfig.fcSdk.removeFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledTimes(12);
      expect(logger.warn).toHaveBeenCalledWith(
        'Timeout waiting for provisionConfig of test-function/LATEST to be removed',
      );
    });

    it('should handle error when removing provision config', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.remote = { defaultTarget: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionProvisionConfig: jest.fn().mockRejectedValue(new Error('remove error')),
        disableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
        enableFunctionInvocation: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await expect((provisionConfig as any).removeProvisionConfig('LATEST')).rejects.toThrow(
        'remove error',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Remove remote provisionConfig of test-function/LATEST error: remove error',
      );
    });
  });

  describe('sanitizeProvisionConfig', () => {
    it('should sanitize provision config correctly', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const config = {
        defaultTarget: 20,
        current: 5,
        functionArn: 'arn:xxx',
        currentError: ['error'],
        targetTrackingPolicies: [],
        scheduledActions: [],
      };

      const result = (provisionConfig as any).sanitizeProvisionConfig(config);

      expect(result).toEqual({
        defaultTarget: 20,
      });
    });

    it('should handle empty config', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const result = (provisionConfig as any).sanitizeProvisionConfig(null);

      expect(result).toEqual({});
    });

    it('should handle config with targetTrackingPolicies and scheduledActions', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const config = {
        defaultTarget: 10,
        targetTrackingPolicies: [{ name: 'policy1' }],
        scheduledActions: [{ name: 'action1' }],
      };

      const result = (provisionConfig as any).sanitizeProvisionConfig(config);

      expect(result).toEqual({
        defaultTarget: 10,
        targetTrackingPolicies: [{ name: 'policy1' }],
        scheduledActions: [{ name: 'action1' }],
      });
    });

    it('should remove target when both target and defaultTarget exist', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const config = {
        target: 5,
        defaultTarget: 10,
        current: 5,
        functionArn: 'arn:xxx',
      };

      const result = (provisionConfig as any).sanitizeProvisionConfig(config);

      expect(result).toEqual({
        defaultTarget: 10,
      });
    });

    it('should remove empty targetTrackingPolicies', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const config = {
        defaultTarget: 10,
        targetTrackingPolicies: [],
        current: 5,
      };

      const result = (provisionConfig as any).sanitizeProvisionConfig(config);

      expect(result).toEqual({
        defaultTarget: 10,
      });
    });

    it('should remove empty scheduledActions', () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      const config = {
        defaultTarget: 10,
        scheduledActions: [],
        current: 5,
      };

      const result = (provisionConfig as any).sanitizeProvisionConfig(config);

      expect(result).toEqual({
        defaultTarget: 10,
      });
    });
  });

  describe('getRemote', () => {
    it('should get remote provision config and sanitize it', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest.fn().mockResolvedValue({
          defaultTarget: 10,
          current: 5,
          functionArn: 'arn:xxx',
        }),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const sanitizeProvisionConfigSpy = jest.spyOn(
        provisionConfig as any,
        'sanitizeProvisionConfig',
      );

      await (provisionConfig as any).getRemote();

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(sanitizeProvisionConfigSpy).toHaveBeenCalledWith({
        defaultTarget: 10,
        current: 5,
        functionArn: 'arn:xxx',
      });
    });

    it('should handle error when getting remote provision config', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionProvisionConfig: jest.fn().mockRejectedValue(new Error('get error')),
      };
      Object.defineProperty(provisionConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (provisionConfig as any).getRemote();

      expect(provisionConfig.fcSdk.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(provisionConfig.remote).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        'Get remote provisionConfig of  test-function error: get error',
      );
    });
  });

  describe('plan', () => {
    it('should set needDeploy to true when remote is empty', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.remote = {};

      await (provisionConfig as any).plan();

      expect(provisionConfig.needDeploy).toBe(true);
    });

    it('should set needDeploy to true when diffResult is empty', async () => {
      provisionConfig = new ProvisionConfig(mockInputs, mockOpts);
      provisionConfig.remote = { defaultTarget: 10 };
      provisionConfig.local = { defaultTarget: 10 };

      // Mock diffConvertYaml
      jest.mock('@serverless-devs/diff', () => ({
        diffConvertYaml: jest.fn().mockReturnValue({ diffResult: {}, show: '' }),
      }));

      // 重新导入模块以应用mock
      const { diffConvertYaml } = require('@serverless-devs/diff');
      (diffConvertYaml as jest.Mock).mockReturnValue({ diffResult: {}, show: '' });

      await (provisionConfig as any).plan();

      expect(provisionConfig.needDeploy).toBe(true);
    });

    it('should prompt user when diffResult is not empty and yes is undefined', async () => {
      // 创建新的实例用于这个测试
      const provisionConfigWithPrompt = new ProvisionConfig(
        mockInputs,
        { yes: undefined }, // 不指定yes参数，需要用户确认
      );
      provisionConfigWithPrompt.remote = { defaultTarget: 5 };
      provisionConfigWithPrompt.local = { defaultTarget: 10 };

      // Mock diffConvertYaml
      jest.mock('@serverless-devs/diff', () => ({
        diffConvertYaml: jest.fn().mockReturnValue({
          diffResult: { defaultTarget: { old: 5, new: 10 } },
          show: 'defaultTarget: 5 -> 10',
        }),
      }));

      // 重新导入模块以应用mock
      const { diffConvertYaml } = require('@serverless-devs/diff');
      (diffConvertYaml as jest.Mock).mockReturnValue({
        diffResult: { defaultTarget: { old: 5, new: 10 } },
        show: 'defaultTarget: 5 -> 10',
      });

      // Mock inquirer
      const inquirer = require('inquirer');
      const promptMock = jest.spyOn(inquirer, 'prompt').mockResolvedValue({ ok: true });

      await (provisionConfigWithPrompt as any).plan();

      expect(promptMock).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'ok',
          message: 'Deploy it with local config?',
        },
      ]);
      expect(logger.write).toHaveBeenCalledWith(
        'provisionConfig was changed, please confirm before deployment:\n',
      );
    });
  });
});
