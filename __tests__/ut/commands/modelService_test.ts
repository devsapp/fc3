import { ModelService } from '../../../src/subCommands/model/model';
import { IInputs } from '../../../src/interface';

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

jest.mock('../../../src/subCommands/model/utils', () => {
  const mockInitClient = jest.fn();
  const mockCheckModelStatus = jest.fn();

  return {
    initClient: mockInitClient,
    checkModelStatus: mockCheckModelStatus,
    _displayProgress: jest.fn(),
    _displayProgressComplete: jest.fn(),
  };
});

describe('ModelService', () => {
  let modelService: ModelService;
  let mockInputs: IInputs;
  let mockDevClient: any;
  let mockInitClient: jest.Mock;
  let mockCheckModelStatus: jest.Mock;

  beforeEach(() => {
    // 获取mock函数的引用
    const utilsModule = require('../../../src/subCommands/model/utils');
    mockInitClient = utilsModule.initClient;
    mockCheckModelStatus = utilsModule.checkModelStatus;

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

    // Setup mock client
    mockDevClient = {
      listFileManagerTasks: jest.fn(),
      fileManagerRsync: jest.fn(),
      getFileManagerTask: jest.fn(),
      removeFileManagerTasks: jest.fn(),
      fileManagerRm: jest.fn(),
    };

    // Reset and set mock implementations
    mockInitClient.mockReset();
    mockInitClient.mockResolvedValue(mockDevClient);
    mockCheckModelStatus.mockReset();
    mockCheckModelStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('downloadModel', () => {
    it('should skip download if modelConfig.mode is "never"', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          model: 'test-model',
          conflictResolution: 'skip',
          mode: 'never',
          timeout: 300,
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      await expect(modelService.downloadModel(name, params)).resolves.toBeUndefined();
      // Even when mode is 'never', initClient is still called because it's called at the beginning of the function
      expect(mockInitClient).toHaveBeenCalled();
    });

    it('should skip download if task already exists and is finished', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          model: 'test-model',
          conflictResolution: 'skip',
          mode: 'once',
          timeout: 300,
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          success: true,
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
                  destination: 'file://mnt/test',
                },
              },
            ],
          },
        },
      });

      await expect(modelService.downloadModel(name, params)).resolves.toBeUndefined();
      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.listFileManagerTasks).toHaveBeenCalled();
      // Should not call fileManagerRsync when task already exists
      expect(mockDevClient.fileManagerRsync).not.toHaveBeenCalled();
    });

    it('should successfully download files when no existing tasks', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          model: 'test-model',
          conflictResolution: 'skip',
          mode: 'once', // 改为'once'以触发listFileManagerTasks调用
          timeout: 300,
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      // Mock listFileManagerTasks to return empty tasks
      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          success: true,
          data: {
            tasks: [],
          },
        },
      });

      // Mock fileManagerRsync to return success
      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: true,
          data: {
            taskID: 'task-123',
          },
          requestId: 'req-123',
        },
      });

      await expect(modelService.downloadModel(name, params)).resolves.toBeUndefined();
      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.listFileManagerTasks).toHaveBeenCalled();
      expect(mockDevClient.fileManagerRsync).toHaveBeenCalled();
    });

    it('should handle download error from fileManagerRsync', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          model: 'test-model',
          conflictResolution: 'skip',
          mode: 'once', // 改为'once'以触发listFileManagerTasks调用
          timeout: 300,
        },
        storage: 'nas',
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        vpcConfig: {},
      };

      mockDevClient.listFileManagerTasks.mockResolvedValue({
        body: {
          success: true,
          data: {
            tasks: [],
          },
        },
      });

      mockDevClient.fileManagerRsync.mockResolvedValue({
        body: {
          success: false,
          data: {},
          requestId: 'req-123',
        },
      });

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error',
      );
      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.listFileManagerTasks).toHaveBeenCalled();
      expect(mockDevClient.fileManagerRsync).toHaveBeenCalled();
    });
  });

  describe('removeModel', () => {
    it('should successfully remove model', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        storage: 'nas',
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
      });

      // 模拟轮询过程：先返回未完成状态，再返回完成状态
      mockDevClient.getFileManagerTask
        .mockResolvedValueOnce({
          body: {
            success: true,
            data: {
              finished: false,
              success: false,
            },
            requestId: 'req-456',
          },
        })
        .mockResolvedValueOnce({
          body: {
            success: true,
            data: {
              finished: true,
              success: true,
            },
            requestId: 'req-789',
          },
        });

      mockDevClient.removeFileManagerTasks.mockResolvedValue({
        body: {
          success: true,
          data: {},
          requestId: 'req-789',
        },
      });

      await expect(modelService.removeModel(name, params)).resolves.toBeUndefined();

      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.fileManagerRm).toHaveBeenCalled();
      expect(mockDevClient.getFileManagerTask).toHaveBeenCalledTimes(2);
      expect(mockDevClient.removeFileManagerTasks).toHaveBeenCalled();
    });

    it('should handle remove error', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        nasMountPoints: [{ mountDir: '/mnt/test' }],
        ossMountPoints: [],
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
        region: 'cn-hangzhou',
        storage: 'nas',
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
      });

      // 模拟错误情况
      mockDevClient.getFileManagerTask.mockResolvedValue({
        body: {
          success: true,
          data: {
            finished: true,
            success: false,
            errorMessage: 'Remove failed',
          },
        },
      });

      await expect(modelService.removeModel(name, params)).rejects.toThrow(
        '[Download-model] model: Remove failed',
      );
      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.fileManagerRm).toHaveBeenCalled();
      expect(mockDevClient.getFileManagerTask).toHaveBeenCalled();
    });
  });
});

describe('Progress functions', () => {
  let originalUtils: any;

  beforeAll(() => {
    // 取消对 utils 的 mock
    jest.unmock('../../../src/subCommands/model/utils');
    // 重新导入原始模块
    originalUtils = require('../../../src/subCommands/model/utils');
  });

  afterAll(() => {
    // 恢复原来的 mock
    jest.mock('../../../src/subCommands/model/utils', () => {
      const mockInitClient = jest.fn();
      const mockCheckModelStatus = jest.fn();

      return {
        initClient: mockInitClient,
        checkModelStatus: mockCheckModelStatus,
        _displayProgress: jest.fn(),
        _displayProgressComplete: jest.fn(),
      };
    });
  });

  describe('_displayProgress', () => {
    it('should display progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      originalUtils._displayProgress('[Model Download]', 512, 1024);

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[Model Download]'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('50.00%'));

      stdoutSpy.mockRestore();
    });
  });

  describe('_displayProgressComplete', () => {
    it('should display complete progress correctly', () => {
      const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true as any);

      originalUtils._displayProgressComplete('[Model Download]', 1024, 1024);

      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('[Model Download]'));
      expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('100.00%'));

      stdoutSpy.mockRestore();
    });
  });
});
