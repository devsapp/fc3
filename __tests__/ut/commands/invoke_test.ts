import Invoke from '../../../src/subCommands/invoke';
import FC from '../../../src/resources/fc';
import logger from '../../../src/logger';
import { IInputs } from '../../../src/interface';
import fs from 'fs';

// Mock dependencies
jest.mock('../../../src/resources/fc', () => {
  return {
    __esModule: true,
    default: Object.assign(
      jest.fn().mockImplementation(() => {
        return {
          invokeFunction: jest.fn().mockResolvedValue({
            headers: {
              'x-fc-code-checksum': 'checksum123',
              'x-fc-instance-id': 'i-12345',
              'x-fc-invocation-service-version': 'LATEST',
              'x-fc-request-id': 'req-12345',
              'x-fc-log-result': 'Test log result',
            },
            body: 'Test response body',
          }),
        };
      }),
      {
        isCustomContainerRuntime: jest.fn().mockReturnValue(false),
      },
    ),
  };
});
jest.mock('../../../src/logger', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    write: jest.fn(),
    error: jest.fn(),
    output: jest.fn(),
    spin: jest.fn(),
    tips: jest.fn(),
    append: jest.fn(),
    tipsOnce: jest.fn(),
    warnOnce: jest.fn(),
    writeOnce: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('Invoke', () => {
  let mockInputs: IInputs;
  let mockFcInstance: any;

  beforeEach(() => {
    mockInputs = {
      cwd: '/test',
      baseDir: '/test',
      name: 'test-app',
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        code: './code',
      },
      command: 'invoke',
      args: [],
      yaml: {
        path: '/test/s.yaml',
      },
      resource: {
        name: 'test-resource',
        component: 'fc3',
        access: 'default',
      },
      outputs: {},
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
        SecurityToken: 'test-token',
      }),
    };

    // Mock FC methods
    mockFcInstance = {
      invokeFunction: jest.fn().mockResolvedValue({
        headers: {
          'x-fc-code-checksum': 'checksum123',
          'x-fc-instance-id': 'i-12345',
          'x-fc-invocation-service-version': 'LATEST',
          'x-fc-request-id': 'req-12345',
          'x-fc-log-result': 'Test log result',
        },
        body: 'Test response body',
      }),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation((...args: any[]) => {
      // Store the constructor arguments for assertion
      (FC as any).mock.calls = (FC as any).mock.calls || [];
      (FC as any).mock.calls.push(args);
      return mockFcInstance;
    });

    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"key": "value"}');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Invoke instance with valid inputs', () => {
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should throw error when function name is not specified', () => {
      delete mockInputs.props.functionName;
      expect(() => new Invoke(mockInputs)).toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should handle function name from command line args', () => {
      mockInputs.args = ['--function-name', 'cli-function'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should handle region from command line args', () => {
      mockInputs.props.region = undefined;
      mockInputs.args = ['--region', 'cn-beijing'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      expect(() => new Invoke(mockInputs)).toThrow('Region not specified, please specify --region');
    });

    it('should handle payload from command line args', () => {
      mockInputs.args = ['--event', '{"test": "data"}'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should handle event file from command line args', () => {
      mockInputs.args = ['--event-file', './test-event.json'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should throw error when event file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockInputs.args = ['--event-file', './non-existent.json'];
      expect(() => new Invoke(mockInputs)).toThrow('Cannot find event-file "./non-existent.json".');
    });

    it('should handle invocation type from command line args', () => {
      mockInputs.args = ['--invocation-type', 'Async'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should throw error when invocation type is invalid', () => {
      mockInputs.args = ['--invocation-type', 'Invalid'];
      expect(() => new Invoke(mockInputs)).toThrow(
        "Invalid 'invocationType': Invalid. Allowed values are: Sync, Async",
      );
    });

    it('should handle qualifier from command line args', () => {
      mockInputs.args = ['--qualifier', '1'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should handle async task id from command line args', () => {
      mockInputs.args = ['--async-task-id', 'task-123'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should handle timeout from command line args', () => {
      mockInputs.args = ['--timeout', '30'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });

    it('should handle silent flag from command line args', () => {
      mockInputs.args = ['--silent'];
      const invoke = new Invoke(mockInputs);
      expect(invoke).toBeInstanceOf(Invoke);
    });
  });

  describe('run', () => {
    it('should invoke function successfully with default parameters', async () => {
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      // Get the last call to FC constructor
      const lastCall = (FC as any).mock.calls[(FC as any).mock.calls.length - 1];
      expect(lastCall[0]).toBe('cn-hangzhou');
      expect(lastCall[2]).toEqual(
        expect.objectContaining({
          userAgent: expect.stringContaining('command:invoke'),
        }),
      );
      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: undefined,
        qualifier: 'LATEST',
        invokeType: 'Sync',
        asyncTaskId: undefined,
      });
      expect(logger.write).toHaveBeenCalled();
    });

    it('should invoke function with payload from command line args', async () => {
      mockInputs.args = ['--event', '{"test": "data"}'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: '{"test": "data"}',
        qualifier: 'LATEST',
        invokeType: 'Sync',
        asyncTaskId: undefined,
      });
    });

    it('should invoke function with payload from event file', async () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('{"file": "data"}');
      mockInputs.args = ['--event-file', './test-event.json'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: '{"file": "data"}',
        qualifier: 'LATEST',
        invokeType: 'Sync',
        asyncTaskId: undefined,
      });
    });

    it('should invoke function with async invocation type', async () => {
      mockInputs.args = ['--invocation-type', 'Async'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: undefined,
        qualifier: 'LATEST',
        invokeType: 'Async',
        asyncTaskId: undefined,
      });
    });

    it('should invoke function with custom qualifier', async () => {
      mockInputs.args = ['--qualifier', '1'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: undefined,
        qualifier: 1, // qualifier is converted to number in the implementation
        invokeType: 'Sync',
        asyncTaskId: undefined,
      });
    });

    it('should invoke function with async task id', async () => {
      mockInputs.args = ['--async-task-id', 'task-123'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(mockFcInstance.invokeFunction).toHaveBeenCalledWith('test-function', {
        payload: undefined,
        qualifier: 'LATEST',
        invokeType: 'Sync',
        asyncTaskId: 'task-123',
      });
    });

    it('should return result when silent flag is set', async () => {
      mockInputs.args = ['--silent'];
      const invoke = new Invoke(mockInputs);
      const result = await invoke.run();

      expect(result).toEqual({
        body: 'Test response body',
      });
      expect(logger.write).not.toHaveBeenCalled();
    });

    it('should handle async invocation with task id in response', async () => {
      mockFcInstance.invokeFunction.mockResolvedValueOnce({
        headers: {
          'x-fc-async-task-id': 'task-123',
          'x-fc-request-id': 'req-12345',
          'x-fc-invocation-service-version': 'LATEST',
        },
        body: 'Async invocation started',
      });

      mockInputs.args = ['--invocation-type', 'Async'];
      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle error response from function', async () => {
      mockFcInstance.invokeFunction.mockResolvedValueOnce({
        headers: {
          'x-fc-code-checksum': 'checksum123',
          'x-fc-instance-id': 'i-12345',
          'x-fc-invocation-service-version': 'LATEST',
          'x-fc-request-id': 'req-12345',
          'x-fc-error-type': 'FunctionError',
          'x-fc-log-result': 'Error log result',
        },
        body: 'Error response body',
      });

      const invoke = new Invoke(mockInputs);
      await invoke.run();

      expect(logger.write).toHaveBeenCalled();
    });
  });
});
