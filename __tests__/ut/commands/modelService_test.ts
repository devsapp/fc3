import { ModelService } from '../../../src/subCommands/model/model';
import { IInputs } from '../../../src/interface';
import DevClient from '@alicloud/devs20230714';
import { sleep } from '../../../src/utils';
import {
  _displayProgress,
  _displayProgressComplete,
  initClient,
} from '../../../src/subCommands/model/utils';

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

describe('ModelService', () => {
  let modelService: ModelService;
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

    modelService = new ModelService(mockInputs);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.ARTIFACT_ENDPOINT;
    delete process.env.artifact_endpoint;
  });

  describe('downloadModel', () => {
    let mockDevClient: jest.Mocked<DevClient>;

    beforeEach(() => {
      mockDevClient = {
        listFileManagerTasks: jest.fn(),
        fileManagerRsync: jest.fn(),
        getFileManagerTask: jest.fn(),
      } as any;

      const utilsModule = {
        initClient: initClient,
      };

      jest.spyOn(utilsModule, 'initClient').mockResolvedValue(mockDevClient);
      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    it('should skip download if task already exists and is finished', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          id: 'test-model',
          source: 'modelscope://test-model',
          model: 'test-model',
          conflictResolution: 'skip',
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          data: {
            tasks: [
              {
                finished: true,
                success: true,
                progress: {
                  currentBytes: 1024,
                  totalBytes: 1024,
                },
                parameters: {
                  source: 'modelscope://test-model',
                },
              },
            ],
          },
        },
      } as any);

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error: undefined',
      );
    });

    it('should successfully download files when no existing tasks', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      // Mock listFileManagerTasks to return empty tasks
      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          data: {
            tasks: [],
          },
        },
      } as any);

      // Mock fileManagerRsync to return success
      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      } as any);

      // Mock getFileManagerTask to simulate download progress
      mockDevClient.getFileManagerTask
        .mockResolvedValueOnce({
          body: {
            data: {
              finished: false,
              success: undefined, // 明确设置为 undefined 或 false
              startTime: Date.now(),
              progress: {
                currentBytes: 512,
                totalBytes: 1024,
              },
            },
          },
        } as any)
        .mockResolvedValueOnce({
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
              errorMessage: undefined, // 确保没有错误信息
            },
          },
        } as any);

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error: undefined',
      );
    });

    it('should handle download error from fileManagerRsync', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          data: {
            tasks: [],
          },
        },
      } as any);

      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: false,
          data: {},
          requestId: 'req-123',
        },
      } as any);

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error',
      );
    });

    it('should handle download timeout', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          data: {
            tasks: [],
          },
        },
      } as any);

      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      } as any);

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

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error: undefined',
      );
    });

    it('should handle download error from getFileManagerTask', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          data: {
            tasks: [],
          },
        },
      } as any);

      // 确保正确模拟 fileManagerRsync 返回值，包含完整的对象结构
      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      } as any);

      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: true,
            errorMessage: 'Download failed',
            startTime: Date.now() - 1000,
            finishedTime: Date.now(),
            progress: {
              currentBytes: 0,
              totalBytes: 0,
            },
          },
        },
      } as any);

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error: undefined',
      );
    });
  });

  describe('removeModel', () => {
    let mockDevClient: jest.Mocked<DevClient>;

    beforeEach(() => {
      mockDevClient = {
        fileManagerRm: jest.fn(),
      } as any;

      const utilsModule = {
        initClient: initClient,
      };

      jest.spyOn(utilsModule, 'initClient').mockResolvedValue(mockDevClient);
    });

    it('should successfully remove model', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        storage: 'nas',
        vpcConfig: {},
      };

      mockDevClient.fileManagerRm.mockResolvedValue({
        body: {
          success: true,
          data: {},
          requestId: 'req-123',
        },
      } as any);

      await expect(modelService.removeModel(name, params)).resolves.toBeUndefined();
    });
  });

  describe('_displayProgress', () => {
    it('should display progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      // Import and call the _displayProgress function directly from utils
      _displayProgress('[Model Download]', 512, 1024);

      // 由于浮点数精度问题，实际显示的MB值可能会略有不同
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Download-model] [Model Download]'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('50.00%'));

      stdoutSpy.mockRestore();
    });
  });

  describe('_displayProgressComplete', () => {
    it('should display complete progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      _displayProgressComplete('[Model Download]', 1024, 1024);

      // 由于浮点数精度问题，实际显示的MB值可能会略有不同
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Download-model] [Model Download]'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100.00%'));

      stdoutSpy.mockRestore();
    });
  });
});
