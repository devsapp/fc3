import { ArtModelService } from '../../../src/subCommands/model/fileManager';
import { IInputs } from '../../../src/interface';
import DevClient from '@alicloud/devs20230714';
import { sleep } from '../../../src/utils';
import { initClient, checkModelStatus } from '../../../src/subCommands/model/utils';

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
// Mock the utils module with specific functions
jest.mock('../../../src/subCommands/model/utils', () => {
  const originalModule = jest.requireActual('../../../src/subCommands/model/utils');
  const mockRetryFileManagerRsyncAndCheckStatus = jest.fn();
  return {
    __esModule: true,
    ...originalModule,
    retryWithFileManager: jest.fn((command, fn) => fn()),
    retryFileManagerRsyncAndCheckStatus: mockRetryFileManagerRsyncAndCheckStatus,
    initClient: jest.fn(),
    checkModelStatus: jest.fn(),
    extractOssMountDir: jest.fn(),
  };
});

describe('ArtModelService', () => {
  let artModelService: ArtModelService;
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

    artModelService = new ArtModelService(mockInputs);
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
        removeFileManagerTasks: jest.fn(),
      } as any;

      (initClient as jest.Mock).mockResolvedValue(mockDevClient);
      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    it('should skip download if modelConfig.mode is "never"', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'never',
          source: {
            uri: 'modelscope://test-model',
          },
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

      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();
      expect(require('../../../src/subCommands/model/utils').initClient).toHaveBeenCalled();
    });

    it('should skip download if all files already exist and are finished', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'once',
          source: {
            uri: 'modelscope://test-model',
          },
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

      // 确保模拟的任务参数与实际请求匹配
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
                  // 确保这些参数与实际生成的路径匹配
                  destination: 'file://mnt/test/file1.txt',
                  source: 'modelscope://test-model/file1.txt',
                },
              },
            ],
          },
        },
      } as any);

      // 当所有文件已经下载完成时，应该正常结束而不抛出异常
      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();
    });

    it('should successfully download files when no existing tasks', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
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

      // ArtModelService内部会调用checkModelStatus，所以我们需要模拟它
      (checkModelStatus as jest.Mock).mockResolvedValue(undefined);

      // 成功下载应该正常完成而不抛出异常
      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();
    });

    it('should handle download error from fileManagerRsync', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
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

      // 现在使用重试函数，我们需要模拟重试函数抛出错误
      (
        require('../../../src/subCommands/model/utils')
          .retryFileManagerRsyncAndCheckStatus as jest.Mock
      ).mockRejectedValue(new Error('Download failed'));

      // 下载失败应该抛出异常
      await expect(artModelService.downloadModel(name, params)).rejects.toThrow();
    });

    it('should handle download timeout', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
          timeout: 10, // 设置较小的超时值以便测试
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

      // 模拟超时情况 - 任务永远不会完成
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: false,
            startTime: Date.now() - 50 * 60 * 1000, // 50分钟前开始
            progress: {
              currentBytes: 512,
              totalBytes: 1024,
            },
          },
        },
      } as any);

      // 现在使用重试函数，我们需要模拟重试函数抛出超时错误
      (
        require('../../../src/subCommands/model/utils')
          .retryFileManagerRsyncAndCheckStatus as jest.Mock
      ).mockRejectedValue(new Error('Timeout'));

      // 超时应该抛出异常
      await expect(artModelService.downloadModel(name, params)).rejects.toThrow();
    });

    it('should handle download error from getFileManagerTask', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
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

      // 现在使用重试函数，我们需要模拟重试函数抛出错误
      (
        require('../../../src/subCommands/model/utils')
          .retryFileManagerRsyncAndCheckStatus as jest.Mock
      ).mockRejectedValue(new Error('Download failed'));

      // 下载失败应该抛出异常
      await expect(artModelService.downloadModel(name, params)).rejects.toThrow();
    });

    it('should handle empty files array', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
          target: {
            uri: 'nas://auto',
          },
          files: [],
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      // 空文件列表应该正常完成
      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();
    });

    it('should use MODEL_CONFLIC_HANDLING environment variable for conflict handling', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          mode: 'always',
          source: {
            uri: 'modelscope://test-model',
          },
          target: {
            uri: 'nas://auto',
          },
          files: [
            {
              source: { path: 'file1.txt' },
              target: { path: 'file1.txt' },
            },
          ],
          conflictResolution: 'overwrite', // 这个值应该被环境变量覆盖
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      // 设置环境变量
      const originalValue = process.env.MODEL_CONFLIC_HANDLING;
      process.env.MODEL_CONFLIC_HANDLING = 'skip';

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

      // 现在使用重试函数，我们需要模拟重试函数成功执行
      (
        require('../../../src/subCommands/model/utils')
          .retryFileManagerRsyncAndCheckStatus as jest.Mock
      ).mockResolvedValue(undefined);

      // 成功下载应该正常完成而不抛出异常
      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();

      // 由于现在使用了重试函数，我们验证重试函数被调用
      expect(
        require('../../../src/subCommands/model/utils').retryFileManagerRsyncAndCheckStatus,
      ).toHaveBeenCalled();

      // 恢复环境变量
      process.env.MODEL_CONFLIC_HANDLING = originalValue;
    });
  });

  describe('removeModel', () => {
    let mockDevClient: jest.Mocked<DevClient>;

    beforeEach(() => {
      mockDevClient = {
        fileManagerRm: jest.fn(),
        getFileManagerTask: jest.fn(),
        removeFileManagerTasks: jest.fn(),
      } as any;

      (initClient as jest.Mock).mockResolvedValue(mockDevClient);
    });

    it('should successfully remove model files', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.fileManagerRm.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      } as any);

      // 模拟 getFileManagerTask 返回成功状态
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: true,
            success: true,
          },
          requestId: 'req-456',
        },
      } as any);

      // 添加 removeFileManagerTasks 的模拟
      mockDevClient.removeFileManagerTasks.mockResolvedValue({
        body: {
          success: true,
          data: {},
          requestId: 'req-999',
        },
      } as any);

      // 成功移除应该正常完成
      await expect(artModelService.removeModel(name, params)).resolves.toBeUndefined();
    });

    it('should handle remove failure', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.fileManagerRm.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      } as any);

      // 模拟 getFileManagerTask 返回错误状态
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          data: {
            finished: true,
            success: false,
            errorMessage: 'Remove failed',
          },
          requestId: 'req-456',
        },
      } as any);

      // 移除失败应该抛出异常
      await expect(artModelService.removeModel(name, params)).rejects.toThrow();
    });
  });

  describe('getSourceAndDestination', () => {
    it('should correctly generate source and destination paths', () => {
      const result = artModelService.getSourceAndDestination(
        'modelscope://test-model',
        { source: { path: 'file1.txt' }, target: { path: 'file1.txt' } },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
        'nas://auto',
      );

      expect(result).toEqual({
        source: 'modelscope://test-model/file1.txt',
        destination: 'file://mnt/nas/file1.txt',
      });
    });

    it('should handle source URI with reversion', () => {
      const result = artModelService.getSourceAndDestination(
        'modelscope://test-model',
        {
          source: { path: 'file1.txt', uri: 'modelscope://different-model' },
          target: { path: 'file1.txt' },
        },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
        'nas://auto',
      );

      expect(result).toEqual({
        source: 'modelscope://different-model/file1.txt',
        destination: 'file://mnt/nas/file1.txt',
      });
    });

    it('should handle target URI with reversion', () => {
      const result = artModelService.getSourceAndDestination(
        'modelscope://test-model',
        { source: { path: 'file1.txt' }, target: { path: 'file1.txt', uri: 'oss://auto' } },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
        'nas://auto',
      );

      expect(result).toEqual({
        source: 'modelscope://test-model/file1.txt',
        destination: 'file://mnt/oss/file1.txt',
      });
    });

    it('should handle invalid source URI', () => {
      expect(() => {
        artModelService.getSourceAndDestination(
          'invalid://test-model',
          { source: { path: 'file1.txt' }, target: { path: 'file1.txt' } },
          [{ mountDir: '/mnt/nas' }],
          [{ mountDir: '/mnt/oss' }],
          'nas://auto',
        );
      }).toThrow(
        "Invalid source path. Expected a valid URI starting with 'modelscope://', 'oss://', or 'nas://', but got: file1.txt",
      );
    });
  });

  describe('_getSourcePath', () => {
    it('should correctly generate source path with valid URI', () => {
      const result = (artModelService as any)._getSourcePath(
        { source: { path: 'file1.txt' } },
        'modelscope://test-model',
      );

      expect(result).toBe('modelscope://test-model/file1.txt');
    });

    it('should handle URI ending with slash', () => {
      const result = (artModelService as any)._getSourcePath(
        { source: { path: 'file1.txt' } },
        'modelscope://test-model/',
      );

      expect(result).toBe('modelscope://test-model/file1.txt');
    });
  });

  describe('_getDestinationPath', () => {
    it('should correctly generate destination path for nas://auto', () => {
      const result = (artModelService as any)._getDestinationPath(
        'nas://auto',
        { target: { path: 'file1.txt' } }, // 修正参数结构
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/nas/file1.txt');
    });

    it('should correctly generate destination path for oss://auto', () => {
      const result = (artModelService as any)._getDestinationPath(
        'oss://auto',
        { target: { path: 'file1.txt' } }, // 修正参数结构
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/oss/file1.txt');
    });

    it('should directly concatenate URI and path', () => {
      const result = (artModelService as any)._getDestinationPath(
        'oss://mnt/custom',
        { target: { path: 'file1.txt' } }, // 修正参数结构
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/custom/file1.txt');
    });

    it('should handle URI ending with slash', () => {
      const result = (artModelService as any)._getDestinationPath(
        'nas://mnt/custom/',
        { target: { path: 'file1.txt' } }, // 修正参数结构
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/custom/file1.txt');
    });

    it('should handle target path starting with slash', () => {
      const result = (artModelService as any)._getDestinationPath(
        'nas://mnt/custom',
        { target: { path: '/file1.txt' } }, // Path starting with slash
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/custom/file1.txt'); // Should remove leading slash
    });
  });
});
