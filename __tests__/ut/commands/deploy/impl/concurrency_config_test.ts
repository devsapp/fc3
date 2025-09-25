import ConcurrencyConfig from '../../../../../src/subCommands/deploy/impl/concurrency_config';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';

// Mocks
// jest.mock('../../../../../src/resources/fc');
// jest.mock('../../../../../src/utils');

describe('ConcurrencyConfig', () => {
  let mockInputs: IInputs;
  let concurrencyConfig: ConcurrencyConfig;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        concurrencyConfig: {
          reservedConcurrency: 10,
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
    it('should initialize correctly with concurrency config', () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);

      expect(concurrencyConfig.functionName).toBe('test-function');
      expect(concurrencyConfig.local).toEqual({ reservedConcurrency: 10 });
    });

    it('should initialize correctly with empty concurrency config', () => {
      const inputsWithoutConcurrencyConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          concurrencyConfig: {} as any,
        },
      };

      concurrencyConfig = new ConcurrencyConfig(inputsWithoutConcurrencyConfig, mockOpts);

      expect(concurrencyConfig.functionName).toBe('test-function');
      expect(concurrencyConfig.local).toEqual({});
    });
  });

  describe('before', () => {
    it('should call getRemote and plan', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      // Use a different approach to test private methods indirectly
      const getRemoteSpy = jest
        .spyOn(concurrencyConfig as any, 'getRemote')
        .mockResolvedValue(Promise.resolve());
      const planSpy = jest
        .spyOn(concurrencyConfig as any, 'plan')
        .mockResolvedValue(Promise.resolve());

      await concurrencyConfig.before();

      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should put function concurrency when needDeploy is true and local config is not empty', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      concurrencyConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionConcurrency: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await concurrencyConfig.run();

      expect(concurrencyConfig.fcSdk.putFunctionConcurrency).toHaveBeenCalledWith(
        'test-function',
        10,
      );
      expect(result).toBe(true);
    });

    it('should attempt to create concurrency config when needDeploy is false but remote config is empty', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      concurrencyConfig.needDeploy = false;
      concurrencyConfig.remote = {};

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionConcurrency: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await concurrencyConfig.run();

      expect(concurrencyConfig.fcSdk.putFunctionConcurrency).toHaveBeenCalledWith(
        'test-function',
        10,
      );
      expect(result).toBe(false);
    });

    it('should skip deployment when needDeploy is false and remote config exists', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      concurrencyConfig.needDeploy = false;
      concurrencyConfig.remote = { reservedConcurrency: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        putFunctionConcurrency: jest.fn(),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await concurrencyConfig.run();

      expect(concurrencyConfig.fcSdk.putFunctionConcurrency).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should remove concurrency config when local config is empty and needDeploy is true', async () => {
      const inputsWithoutConcurrencyConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          concurrencyConfig: {} as any,
        },
      };

      concurrencyConfig = new ConcurrencyConfig(inputsWithoutConcurrencyConfig, mockOpts);
      concurrencyConfig.needDeploy = true;
      concurrencyConfig.remote = { reservedConcurrency: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionConcurrency: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await concurrencyConfig.run();

      expect(concurrencyConfig.fcSdk.removeFunctionConcurrency).toHaveBeenCalledWith(
        'test-function',
      );
    });

    it('should handle error when removing concurrency config', async () => {
      const inputsWithoutConcurrencyConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          concurrencyConfig: {} as any,
        },
      };

      concurrencyConfig = new ConcurrencyConfig(inputsWithoutConcurrencyConfig, mockOpts);
      concurrencyConfig.needDeploy = true;
      concurrencyConfig.remote = { reservedConcurrency: 10 };

      // Mock fcSdk
      const mockFcSdk = {
        removeFunctionConcurrency: jest.fn().mockRejectedValue(new Error('remove error')),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await concurrencyConfig.run();

      expect(concurrencyConfig.fcSdk.removeFunctionConcurrency).toHaveBeenCalledWith(
        'test-function',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Remove remote concurrencyConfig of  test-function error: remove error',
      );
    });

    it('should handle empty local config', async () => {
      const inputsWithoutConcurrencyConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          concurrencyConfig: {} as any,
        },
      };

      concurrencyConfig = new ConcurrencyConfig(inputsWithoutConcurrencyConfig, mockOpts);

      const result = await concurrencyConfig.run();

      expect(result).toBe(true);
    });
  });

  describe('getRemote', () => {
    it('should get remote concurrency config', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionConcurrency: jest.fn().mockResolvedValue({
          reservedConcurrency: 10,
          functionArn: 'arn:xxx',
        }),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (concurrencyConfig as any).getRemote();

      expect(concurrencyConfig.fcSdk.getFunctionConcurrency).toHaveBeenCalledWith('test-function');
      expect(concurrencyConfig.remote).toEqual({ reservedConcurrency: 10 });
    });

    it('should handle error when getting remote concurrency config', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getFunctionConcurrency: jest.fn().mockRejectedValue(new Error('get error')),
      };
      Object.defineProperty(concurrencyConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      await (concurrencyConfig as any).getRemote();

      expect(concurrencyConfig.fcSdk.getFunctionConcurrency).toHaveBeenCalledWith('test-function');
      expect(concurrencyConfig.remote).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        'Get remote concurrencyConfig of  test-function error: get error',
      );
    });
  });

  describe('plan', () => {
    it('should set needDeploy to true when remote is empty', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      concurrencyConfig.remote = {};

      await (concurrencyConfig as any).plan();

      expect(concurrencyConfig.needDeploy).toBe(true);
    });

    it('should set needDeploy to true when diffResult is empty', async () => {
      concurrencyConfig = new ConcurrencyConfig(mockInputs, mockOpts);
      concurrencyConfig.remote = { reservedConcurrency: 10 };
      concurrencyConfig.local = { reservedConcurrency: 10 };

      // Mock diffConvertYaml
      jest.mock('@serverless-devs/diff', () => ({
        diffConvertYaml: jest.fn().mockReturnValue({ diffResult: {}, show: '' }),
      }));

      await (concurrencyConfig as any).plan();

      expect(concurrencyConfig.needDeploy).toBe(true);
    });
  });
});
