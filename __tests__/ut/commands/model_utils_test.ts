import {
  _getEndpoint,
  initClient,
  _displayProgress,
  _displayProgressComplete,
  checkModelStatus,
} from '../../../src/subCommands/model/utils';
import DevClient from '@alicloud/devs20230714';
import * as $OpenApi from '@alicloud/openapi-client';
import { IInputs } from '../../../src/interface';
import { sleep } from '../../../src/utils';

// Mock dependencies
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

jest.mock('@alicloud/devs20230714');
jest.mock('@alicloud/openapi-client');
jest.mock('../../../src/utils');

describe('Model Utils', () => {
  describe('_getEndpoint', () => {
    afterEach(() => {
      delete process.env.ARTIFACT_ENDPOINT;
      delete process.env.artifact_endpoint;
    });

    it('should return ARTIFACT_ENDPOINT when it is set', () => {
      process.env.ARTIFACT_ENDPOINT = 'custom.endpoint.com';
      process.env.artifact_endpoint = 'custom.endpoint.com';

      const endpoint = _getEndpoint('cn-hangzhou');

      expect(endpoint).toBe('custom.endpoint.com');
    });

    it('should return artifact_endpoint when ARTIFACT_ENDPOINT is not set but artifact_endpoint is set', () => {
      process.env.artifact_endpoint = 'custom2.endpoint.com';

      const endpoint = _getEndpoint('cn-hangzhou');

      expect(endpoint).toBe('custom2.endpoint.com');
    });

    it('should return default endpoint when neither environment variable is set', () => {
      const endpoint = _getEndpoint('cn-hangzhou');

      expect(endpoint).toBe('devs.cn-hangzhou.aliyuncs.com');
    });
  });

  describe('initClient', () => {
    let mockInputs: IInputs;

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
        command: 'model',
        args: ['download'],
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
        userAgent: 'test-agent',
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete process.env.ARTIFACT_ENDPOINT;
      delete process.env.artifact_endpoint;
    });

    it('should create DevClient with default configuration', async () => {
      const mockConfig = {
        accessKeyId: 'test-key',
        accessKeySecret: 'test-secret',
        securityToken: 'test-token',
        protocol: 'https',
        endpoint: 'devs.cn-hangzhou.aliyuncs.com',
        readTimeout: 300000,
        connectTimeout: 300000,
        userAgent: 'test-agent',
      };

      ($OpenApi.Config as unknown as jest.Mock).mockImplementation((config) => config);

      const client = await initClient(
        mockInputs,
        'cn-hangzhou',
        (
          await import('../../../src/logger')
        ).default,
        'fun-model',
      );

      expect($OpenApi.Config).toHaveBeenCalledWith(expect.objectContaining(mockConfig));
      expect(client).toBeInstanceOf(DevClient);
    });

    it('should use custom endpoint from ARTIFACT_ENDPOINT environment variable', async () => {
      process.env.ARTIFACT_ENDPOINT = 'custom.endpoint.com';

      ($OpenApi.Config as unknown as jest.Mock).mockImplementation((config) => config);

      const client = await initClient(
        mockInputs,
        'cn-hangzhou',
        (
          await import('../../../src/logger')
        ).default,
        'fun-art',
      );

      expect($OpenApi.Config).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'custom.endpoint.com',
        }),
      );
      expect(client).toBeInstanceOf(DevClient);
    });
  });

  describe('checkModelStatus', () => {
    let mockDevClient: jest.Mocked<DevClient>;
    let mockLogger: any;

    beforeEach(() => {
      mockDevClient = {
        getFileManagerTask: jest.fn(),
      } as any;

      mockLogger = {
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

      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should complete successfully when task is finished and successful', async () => {
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: true,
            success: true,
            startTime: Date.now() - 1000,
            finishedTime: Date.now(),
            progress: {
              currentBytes: 1024,
              totalBytes: 1024,
              total: true,
            },
            errorMessage: null,
          },
        },
      } as any);

      const result = await checkModelStatus(
        mockDevClient,
        'task-123',
        mockLogger,
        'file1.txt',
        30000,
      );

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Time taken for file1.txt download: 1s.');
      expect(mockLogger.info).toHaveBeenCalledWith('[Download-model] Download file1.txt finished.');
    });

    it('should throw error when task has errorMessage', async () => {
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: true,
            success: false,
            startTime: Date.now() - 1000,
            finishedTime: Date.now(),
            progress: {
              currentBytes: 0,
              totalBytes: 0,
            },
            errorMessage: 'Download failed',
          },
          requestId: 'req-123',
        },
      } as any);

      await expect(
        checkModelStatus(mockDevClient, 'task-123', mockLogger, 'file1.txt', 30000),
      ).rejects.toThrow('[Download-model] file1.txt: Download failed ,requestId: req-123');
    });

    it('should handle download timeout', async () => {
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: false,
            startTime: Date.now() - 50 * 60 * 1000, // 50 minutes ago
            progress: {
              currentBytes: 512,
              totalBytes: 1024,
            },
          },
        },
      } as any);

      await expect(
        checkModelStatus(mockDevClient, 'task-123', mockLogger, 'file1.txt', 30000),
      ).rejects.toThrow('Download timeout after 0.5 minutes');
    });

    it('should adjust sleep time for large files', async () => {
      // First call returns unfinished task with large file size
      mockDevClient.getFileManagerTask.mockResolvedValueOnce({
        body: {
          data: {
            finished: false,
            startTime: Date.now(),
            progress: {
              currentBytes: 512,
              totalBytes: 2 * 1024 * 1024 * 1024, // 2GB file
            },
          },
        },
      } as any);

      // Second call returns finished task
      mockDevClient.getFileManagerTask.mockResolvedValueOnce({
        body: {
          data: {
            finished: true,
            success: true,
            startTime: Date.now() - 10000,
            finishedTime: Date.now(),
            progress: {
              currentBytes: 2 * 1024 * 1024 * 1024,
              totalBytes: 2 * 1024 * 1024 * 1024,
              total: true,
            },
          },
        },
      } as any);

      const result = await checkModelStatus(
        mockDevClient,
        'task-123',
        mockLogger,
        'file1.txt',
        30000,
      );

      expect(result).toBe(true);
      // For large files, it should sleep for 10 seconds instead of 2
      expect(sleep).toHaveBeenCalledWith(10);
    });
  });
});
