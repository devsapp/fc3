import AsyncInvokeConfig from '../../../../../src/subCommands/deploy/impl/async_invoke_config';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';
import { GetApiType } from '../../../../../src/resources/fc';

// Mocks
jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/utils');

describe('AsyncInvokeConfig', () => {
  let mockInputs: IInputs;
  let asyncInvokeConfig: AsyncInvokeConfig;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        asyncInvokeConfig: {
          destinationConfig: {
            onSuccess: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
            },
            onFailure: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
            },
          },
          maxAsyncEventAgeInSeconds: 3600,
          maxAsyncRetryAttempts: 3,
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
    it('should initialize correctly with async invoke config', () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);

      expect(asyncInvokeConfig.functionName).toBe('test-function');
      expect(asyncInvokeConfig.local).toEqual(mockInputs.props?.asyncInvokeConfig);
    });

    it('should initialize correctly with empty async invoke config', () => {
      const inputsWithoutAsyncInvokeConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          asyncInvokeConfig: {},
        },
      };

      asyncInvokeConfig = new AsyncInvokeConfig(inputsWithoutAsyncInvokeConfig, mockOpts);

      expect(asyncInvokeConfig.functionName).toBe('test-function');
      expect(asyncInvokeConfig.local).toEqual({});
    });
  });

  describe('before', () => {
    it('should call getRemote and plan', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      // Use a different approach to test private methods indirectly
      const getRemoteSpy = jest
        .spyOn(asyncInvokeConfig as any, 'getRemote')
        .mockResolvedValue(Promise.resolve());
      const planSpy = jest
        .spyOn(asyncInvokeConfig as any, 'plan')
        .mockResolvedValue(Promise.resolve());

      await asyncInvokeConfig.before();

      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should put async invoke config when needDeploy is true and local config is not empty', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      asyncInvokeConfig.needDeploy = true;

      // Mock fcSdk
      const mockFcSdk = {
        putAsyncInvokeConfig: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(asyncInvokeConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await asyncInvokeConfig.run();

      expect(asyncInvokeConfig.fcSdk.putAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          destinationConfig: {
            onSuccess: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
            },
            onFailure: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
            },
          },
          maxAsyncEventAgeInSeconds: 3600,
          maxAsyncRetryAttempts: 3,
        }),
      );
      expect(result).toBe(true);
    });

    it('should attempt to create async invoke config when needDeploy is false but remote config is empty', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      asyncInvokeConfig.needDeploy = false;
      asyncInvokeConfig.remote = {};

      // Mock fcSdk
      const mockFcSdk = {
        putAsyncInvokeConfig: jest.fn().mockResolvedValue({}),
      };
      Object.defineProperty(asyncInvokeConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await asyncInvokeConfig.run();

      expect(asyncInvokeConfig.fcSdk.putAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          destinationConfig: {
            onSuccess: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
            },
            onFailure: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
            },
          },
          maxAsyncEventAgeInSeconds: 3600,
          maxAsyncRetryAttempts: 3,
        }),
      );
      expect(result).toBe(false);
    });

    it('should skip deployment when needDeploy is false and remote config exists', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      asyncInvokeConfig.needDeploy = false;
      asyncInvokeConfig.remote = {
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
          },
          onFailure: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
          },
        },
        maxAsyncEventAgeInSeconds: 3600,
        maxAsyncRetryAttempts: 3,
      };

      // Mock fcSdk
      const mockFcSdk = {
        putAsyncInvokeConfig: jest.fn(),
      };
      Object.defineProperty(asyncInvokeConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const result = await asyncInvokeConfig.run();

      expect(asyncInvokeConfig.fcSdk.putAsyncInvokeConfig).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle empty local config', async () => {
      const inputsWithoutAsyncInvokeConfig = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          asyncInvokeConfig: {},
        },
      };

      asyncInvokeConfig = new AsyncInvokeConfig(inputsWithoutAsyncInvokeConfig, mockOpts);

      const result = await asyncInvokeConfig.run();

      expect(result).toBe(true);
    });
  });

  describe('getRemote', () => {
    it('should get remote async invoke config', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getAsyncInvokeConfig: jest.fn().mockResolvedValue({
          destinationConfig: {
            onSuccess: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
            },
            onFailure: {
              destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
            },
          },
          maxAsyncEventAgeInSeconds: 3600,
          maxAsyncRetryAttempts: 3,
          qualifier: 'LATEST',
        }),
      };
      Object.defineProperty(asyncInvokeConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Call the method through the public before method which calls getRemote
      await (asyncInvokeConfig as any).getRemote();

      expect(asyncInvokeConfig.fcSdk.getAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        GetApiType.simpleUnsupported,
      );
      expect(asyncInvokeConfig.remote).toEqual({
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
          },
          onFailure: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
          },
        },
        maxAsyncEventAgeInSeconds: 3600,
        maxAsyncRetryAttempts: 3,
        qualifier: 'LATEST',
      });
    });

    it('should handle error when getting remote async invoke config', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);

      // Mock fcSdk
      const mockFcSdk = {
        getAsyncInvokeConfig: jest.fn().mockRejectedValue(new Error('get error')),
      };
      Object.defineProperty(asyncInvokeConfig, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Call the method through the public before method which calls getRemote
      await (asyncInvokeConfig as any).getRemote();

      expect(asyncInvokeConfig.fcSdk.getAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        GetApiType.simpleUnsupported,
      );
      expect(asyncInvokeConfig.remote).toEqual({});
      expect(logger.debug).toHaveBeenCalledWith(
        'Get remote asyncInvokeConfig of  test-function error: get error',
      );
    });
  });

  describe('plan', () => {
    it('should set needDeploy to true when remote is empty', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      asyncInvokeConfig.remote = {};

      await (asyncInvokeConfig as any).plan();

      expect(asyncInvokeConfig.needDeploy).toBe(true);
    });

    it('should set needDeploy to true when diffResult is empty', async () => {
      asyncInvokeConfig = new AsyncInvokeConfig(mockInputs, mockOpts);
      asyncInvokeConfig.remote = {
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
          },
          onFailure: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
          },
        },
        maxAsyncEventAgeInSeconds: 3600,
        maxAsyncRetryAttempts: 3,
      };
      asyncInvokeConfig.local = {
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-success',
          },
          onFailure: {
            destination: 'acs:fc:cn-hangzhou:123456789:function:test-on-failure',
          },
        },
        maxAsyncEventAgeInSeconds: 3600,
        maxAsyncRetryAttempts: 3,
      };

      // Mock diffConvertYaml
      jest.mock('@serverless-devs/diff', () => ({
        diffConvertYaml: jest.fn().mockReturnValue({ diffResult: {}, show: '' }),
      }));

      await (asyncInvokeConfig as any).plan();

      expect(asyncInvokeConfig.needDeploy).toBe(true);
    });
  });
});
