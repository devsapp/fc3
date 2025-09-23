import Logs from '../../src/subCommands/logs';
import FC from '../../src/resources/fc';
import logger from '../../src/logger';
import { IInputs } from '../../src/interface';
import inquirer from 'inquirer';
import { SLS } from 'aliyun-sdk';

// Mock dependencies
jest.mock('../../src/resources/fc');
jest.mock('../../src/logger', () => {
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
jest.mock('inquirer');
jest.mock('aliyun-sdk');

describe('Logs', () => {
  let mockInputs: IInputs;
  let logs: Logs;
  let mockFcInstance: any;
  let mockSlsClient: any;

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
      command: 'logs',
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
      credential: {
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
        SecurityToken: 'test-token',
      },
    };

    // Mock FC methods
    mockFcInstance = {
      getFunction: jest.fn().mockResolvedValue({
        functionName: 'test-function',
        logConfig: {
          project: 'test-project',
          logstore: 'test-logstore',
        },
      }),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    // Mock SLS client
    mockSlsClient = {
      getLogs: jest.fn().mockImplementation((params, callback) => {
        callback(null, {
          body: {
            '1': {
              message:
                'FC Invoke Start RequestId: req-12345678-1234-1234-1234-123456789012 Test log message',
              __time__: 1234567890,
              instanceID: 'i-12345',
              functionName: 'test-function',
              qualifier: 'LATEST',
              versionId: '1',
            },
          },
          headers: {
            'x-log-count': 1,
            'x-log-progress': 'Complete',
          },
        });
      }),
    };

    (SLS as any).mockImplementation(() => mockSlsClient);

    (inquirer.prompt as jest.Mock).mockResolvedValue({ logstore: 'test-logstore' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Logs instance with valid inputs', () => {
      logs = new Logs(mockInputs);
      expect(logs).toBeInstanceOf(Logs);
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      expect(() => new Logs(mockInputs)).toThrow('region not specified, please specify --region');
    });

    it('should handle function name from command line args', () => {
      mockInputs.args = ['--function-name', 'cli-function'];
      logs = new Logs(mockInputs);
      expect(logs).toBeInstanceOf(Logs);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should execute history logs successfully', async () => {
      await logs.run();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        expect.any(Object),
        expect.objectContaining({
          userAgent: expect.stringContaining('command:logs'),
        }),
      );
      expect(mockFcInstance.getFunction).toHaveBeenCalledWith('test-function', 'simple');
      expect(mockSlsClient.getLogs).toHaveBeenCalled();
    });

    it('should execute realtime logs when tail flag is provided', async () => {
      mockInputs.args = ['--tail'];
      logs = new Logs(mockInputs);

      // Mock sleep to avoid waiting
      jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2023-01-01').valueOf());

      // We'll only wait for a short time in the test
      const originalTimeout = jest.setTimeout;
      jest.setTimeout(5000);

      // Mock the realtime function to only run one iteration
      const mockRealtime = jest
        .spyOn(logs as any, 'realtime')
        .mockImplementation(async function (this: any) {
          // Just run one iteration and return
          const params = {
            projectName: 'test-project',
            logStoreName: 'test-logstore',
            topic: 'FCLogs:test-function',
            query: '',
            search: '',
            qualifier: '',
            match: '',
          };
          // Call the single iteration method
          await this._realtimeOnce(params);
        });

      await logs.run();

      expect(mockSlsClient.getLogs).toHaveBeenCalled();

      // Restore mocks
      mockRealtime.mockRestore();
      // Restore timeout
      jest.setTimeout = originalTimeout;
      (global.Date.now as jest.Mock).mockRestore();
    }, 10000);
  });

  describe('getInputs', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should get inputs successfully with basic configuration', async () => {
      const props = await (logs as any).getInputs();

      expect(props).toEqual(
        expect.objectContaining({
          region: 'cn-hangzhou',
          projectName: 'test-project',
          logStoreName: 'test-logstore',
          topic: 'FCLogs:test-function',
        }),
      );
    });

    it('should throw error when function name is not specified', async () => {
      delete mockInputs.props.functionName;
      logs = new Logs(mockInputs);

      await expect((logs as any).getInputs()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when logConfig does not exist', async () => {
      mockFcInstance.getFunction.mockResolvedValueOnce({
        functionName: 'test-function',
        logConfig: null,
      });
      logs = new Logs(mockInputs);

      await expect((logs as any).getInputs()).rejects.toThrow(
        'logConfig does not exist, you can set the config in yaml or on https://fcnext.console.aliyun.com/cn-hangzhou/functions/test-function?tab=logging',
      );
    });

    it('should handle function name with qualifier', async () => {
      mockInputs.args = ['--function-name', 'test-function$LATEST'];
      logs = new Logs(mockInputs);

      const props = await (logs as any).getInputs();

      expect(props.topic).toBe('test-function');
      expect(props.query).toBe('LATEST');
    });
  });

  describe('getFunction', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should get function successfully', async () => {
      const result = await (logs as any).getFunction('test-function');

      expect(result).toEqual({
        functionName: 'test-function',
        logConfig: {
          project: 'test-project',
          logstore: 'test-logstore',
        },
      });
    });

    it('should handle function not found error', async () => {
      const error = new Error('Function not found');
      (error as any).code = 'FunctionNotFound';
      mockFcInstance.getFunction.mockRejectedValueOnce(error);

      const result = await (logs as any).getFunction('test-function');

      expect(result).toEqual({
        error: {
          code: 'FunctionNotFound',
          message: 'Function not found',
        },
      });
    });
  });

  describe('history', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should get history logs with default time range', async () => {
      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        search: '',
        type: '',
        requestId: '',
        instanceId: '',
        qualifier: '',
        startTime: '',
        endTime: '',
      };

      const result = await (logs as any).history(params);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          message:
            'FC Invoke Start RequestId: req-12345678-1234-1234-1234-123456789012 Test log message',
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle time range parameters', async () => {
      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        search: '',
        type: '',
        requestId: '',
        instanceId: '',
        qualifier: '',
        startTime: '2023-01-01T00:00:00Z',
        endTime: '2023-01-01T01:00:00Z',
      };

      const result = await (logs as any).history(params);

      expect(result).toHaveLength(1);
    });

    it('should throw error for invalid time format', async () => {
      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        search: '',
        type: '',
        requestId: '',
        instanceId: '',
        qualifier: '',
        startTime: 'invalid-date',
        endTime: 'also-invalid',
      };

      await expect((logs as any).history(params)).rejects.toThrow(
        "The obtained time format is wrong. The time parameter can be a timestamp, or the format: 'yyyy-MM-ddTHH:mm:ssZ', such as '1623005699000', '2021-06-07T02:54:59+08:00', '2021-06-06T18:54:59Z'",
      );
    });
  });

  describe('realtime', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should get realtime logs', async () => {
      // Mock sleep to avoid waiting
      jest.spyOn(global.Date, 'now').mockImplementation(() => new Date('2023-01-01').valueOf());

      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        search: '',
        qualifier: '',
        match: '',
      };

      // We'll only run one iteration in the test
      (logs as any).getLogs = jest.fn().mockResolvedValue([
        {
          message: 'Test log message',
          requestId: 'req-123',
          timestamp: 1234567890,
          time: '2023-01-01 00:00:00',
          extra: {
            instanceID: 'i-12345',
            functionName: 'test-function',
            qualifier: 'LATEST',
            versionId: '1',
          },
        },
      ]);

      // Only run one iteration by mocking the while loop condition
      let callCount = 0;
      const originalRealtime = (logs as any).realtime;
      (logs as any).realtime = async function (this: any, params: any) {
        if (callCount >= 1) return;
        callCount++;
        // Call the original _realtimeOnce method instead of the full realtime method
        await this._realtimeOnce(params);
      };

      await (logs as any).realtime(params);

      expect((logs as any).getLogs).toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('realtime:'));

      // Restore mocks
      (logs as any).realtime = originalRealtime;
      (global.Date.now as jest.Mock).mockRestore();
    }, 10000);
  });

  describe('getLogs', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should get logs successfully', async () => {
      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        from: 1234567890,
        to: 1234567900,
      };

      const result = await (logs as any).getLogs(params);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          message:
            'FC Invoke Start RequestId: req-12345678-1234-1234-1234-123456789012 Test log message',
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle SLS client errors', async () => {
      const params = {
        projectName: 'test-project',
        logStoreName: 'test-logstore',
        topic: 'FCLogs:test-function',
        query: '',
        from: 1234567890,
        to: 1234567900,
      };

      mockSlsClient.getLogs.mockImplementationOnce((params, callback) => {
        callback(new Error('SLS error'), null);
      });

      await expect((logs as any).getLogs(params)).rejects.toThrow('SLS error');
    });
  });

  describe('filterByKeywords', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should filter logs by success type', () => {
      const logsList = [
        {
          requestId: 'req-1',
          message: 'Normal log message',
        },
        {
          requestId: 'req-2',
          message: 'Error: Something went wrong [ERROR]',
        },
      ];

      const result = (logs as any).filterByKeywords(logsList, { type: 'success' });

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe('req-1');
    });

    it('should filter logs by fail type', () => {
      const logsList = [
        {
          requestId: 'req-1',
          message: 'Normal log message',
        },
        {
          requestId: 'req-2',
          message: 'Error: Something went wrong [ERROR]',
        },
      ];

      const result = (logs as any).filterByKeywords(logsList, { type: 'fail' });

      expect(result).toHaveLength(1);
      expect(result[0].requestId).toBe('req-2');
    });

    it('should return all logs when no filter type specified', () => {
      const logsList = [
        {
          requestId: 'req-1',
          message: 'Normal log message',
        },
        {
          requestId: 'req-2',
          message: 'Error: Something went wrong [ERROR]',
        },
      ];

      const result = (logs as any).filterByKeywords(logsList, { type: '' });

      expect(result).toHaveLength(2);
    });
  });

  describe('getSlsQuery', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should generate SLS query with all parameters', () => {
      const result = (logs as any).getSlsQuery(
        'baseQuery',
        'searchTerm',
        'LATEST',
        'req-123',
        'inst-456',
      );

      expect(result).toBe('baseQuery and searchTerm and LATEST and inst-456 and req-123');
    });

    it('should generate SLS query with some parameters', () => {
      const result = (logs as any).getSlsQuery(null, 'searchTerm', null, null, null);

      expect(result).toBe('searchTerm');
    });

    it('should generate empty query when no parameters provided', () => {
      const result = (logs as any).getSlsQuery(null, null, null, null, null);

      expect(result).toBe('');
    });
  });

  describe('compareLogConfig', () => {
    beforeEach(() => {
      logs = new Logs(mockInputs);
    });

    it('should skip comparison when local logConfig is empty', () => {
      mockInputs.props.logConfig = undefined;
      (logs as any).compareLogConfig({ project: 'test', logstore: 'test' });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should skip comparison when local logConfig is auto and matches remote', () => {
      mockInputs.props.logConfig = 'auto';
      (logs as any).region = 'cn-hangzhou';

      (logs as any).compareLogConfig({
        project: '123456789-cn-hangzhou-project',
        logstore: 'function-logstore',
      });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should warn when local and remote logConfig differ', () => {
      mockInputs.props.logConfig = { project: 'local-project', logstore: 'local-logstore' };

      (logs as any).compareLogConfig({ project: 'remote-project', logstore: 'remote-logstore' });

      expect(logger.warn).toHaveBeenCalledWith(
        'Your local logConfig is different from remote, please check it.',
      );
    });
  });
});
