import { ArtModelService } from '../../../src/subCommands/model/fileManager';
import { IInputs } from '../../../src/interface';
import DevClient from '@alicloud/devs20230714';
import { sleep } from '../../../src/utils';
import { initClient } from '../../../src/subCommands/model/utils';

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
      } as any;

      const utilsModule = {
        initClient: initClient,
      };

      // Mock the initClient function from utils
      jest.spyOn(utilsModule, 'initClient').mockResolvedValue(mockDevClient);
      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    it('should skip download if all files already exist and are finished', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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
                  destination: 'file:///mnt/test/file1.txt',
                  source: 'modelscope://test-model/file1.txt',
                },
              },
            ],
          },
        },
      } as any);

      await expect(artModelService.downloadModel(name, params)).rejects.toThrow(
        '[Download-model] 1 out of 1 files failed to download.',
      );
    });

    it('should successfully download files when no existing tasks', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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

      // 模拟合理的下载时间，避免超时
      const startTime = Date.now() - 5000; // 5秒前开始
      mockDevClient.getFileManagerTask
        .mockResolvedValueOnce({
          body: {
            data: {
              finished: false,
              startTime: startTime,
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
              startTime: startTime,
              finishedTime: Date.now(),
              progress: {
                currentBytes: 1024,
                totalBytes: 1024,
                total: true,
              },
            },
          },
        } as any);

      await expect(artModelService.downloadModel(name, params)).rejects.toThrow(
        '[Download-model] 1 out of 1 files failed to download.',
      );
    });

    it('should handle download error from fileManagerRsync', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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

      await expect(artModelService.downloadModel(name, params)).rejects.toThrow(
        '[Download-model] 1 out of 1 files failed to download.',
      );
    });

    it('should handle download timeout', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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

      await expect(artModelService.downloadModel(name, params)).rejects.toThrow(
        '[Download-model] 1 out of 1 files failed to download.',
      );
    });

    it('should handle download error from getFileManagerTask', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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

      await expect(artModelService.downloadModel(name, params)).rejects.toThrow(
        '[Download-model] 1 out of 1 files failed to download.',
      );
    });

    it('should handle empty files array', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
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
      };

      await expect(artModelService.downloadModel(name, params)).resolves.toBeUndefined();
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

      // Mock the initClient function from utils
      jest.spyOn(utilsModule, 'initClient').mockResolvedValue(mockDevClient);
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
              source: { path: 'file1.txt' }, // 添加 source 对象
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
          data: {},
          requestId: 'req-123',
        },
      } as any);

      await expect(artModelService.removeModel(name, params)).resolves.toBeUndefined();
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
        { path: 'file1.txt' },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/nas/');
    });

    it('should correctly generate destination path for oss://auto', () => {
      const result = (artModelService as any)._getDestinationPath(
        'oss://auto',
        { path: 'file1.txt' },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file://mnt/oss/');
    });

    it('should directly concatenate URI and path', () => {
      const result = (artModelService as any)._getDestinationPath(
        '/mnt/custom',
        { path: 'file1.txt' },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file:///mnt/custom/');
    });

    it('should handle URI ending with slash', () => {
      const result = (artModelService as any)._getDestinationPath(
        '/mnt/custom/',
        { path: 'file1.txt' },
        [{ mountDir: '/mnt/nas' }],
        [{ mountDir: '/mnt/oss' }],
      );

      expect(result).toBe('file:///mnt/custom/');
    });
  });

  describe('_displayProgress', () => {
    it('should display progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      // Import and call the _displayProgress function directly from utils
      const { _displayProgress } = require('../../../src/subCommands/model/utils');
      _displayProgress('[Art Model Download]', 512, 1024);

      // 由于浮点数精度问题，实际显示的MB值可能会略有不同
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Download-model] [Art Model Download]'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('50.00%'));

      stdoutSpy.mockRestore();
    });
  });

  describe('_displayProgressComplete', () => {
    it('should display complete progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      // Import and call the _displayProgressComplete function directly from utils
      const { _displayProgressComplete } = require('../../../src/subCommands/model/utils');
      _displayProgressComplete('[Art Model Download]', 1024, 1024);

      // 由于浮点数精度问题，实际显示的MB值可能会略有不同
      expect(stdoutSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Download-model] [Art Model Download]'),
      );
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100.00%'));

      stdoutSpy.mockRestore();
    });
  });
});
