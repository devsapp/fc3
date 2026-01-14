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
  const mockRetryWithFileManager = jest.fn((command, fn) => fn());
  const mockRetryFileManagerRsyncAndCheckStatus = jest.fn();
  const mockRetryFileManagerRm = jest.fn();

  return {
    initClient: mockInitClient,
    checkModelStatus: mockCheckModelStatus,
    retryWithFileManager: mockRetryWithFileManager,
    retryFileManagerRsyncAndCheckStatus: mockRetryFileManagerRsyncAndCheckStatus,
    retryFileManagerRm: mockRetryFileManagerRm,
    _displayProgress: jest.fn(),
    _displayProgressComplete: jest.fn(),
    extractOssMountDir: jest.fn(),
  };
});

describe('ModelService', () => {
  let modelService: ModelService;
  let mockInputs: IInputs;
  let mockDevClient: any;
  let mockInitClient: jest.Mock;
  let mockCheckModelStatus: jest.Mock;
  let mockRetryFileManagerRsyncAndCheckStatus: jest.Mock;
  let mockRetryFileManagerRm: jest.Mock;

  beforeEach(() => {
    // 获取mock函数的引用
    const utilsModule = require('../../../src/subCommands/model/utils');
    mockInitClient = utilsModule.initClient;
    mockCheckModelStatus = utilsModule.checkModelStatus;
    mockRetryFileManagerRsyncAndCheckStatus = utilsModule.retryFileManagerRsyncAndCheckStatus;
    mockRetryFileManagerRm = utilsModule.retryFileManagerRm;

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
      // 现在使用了重试函数，所以直接检查重试函数是否被调用
      expect(mockRetryFileManagerRsyncAndCheckStatus).toHaveBeenCalled();
    });

    it('should use MODEL_CONFLIC_HANDLING environment variable for conflict handling', async () => {
      const name = 'test-project$test-env$test-function';
      const params = {
        modelConfig: {
          source: 'modelscope://test-model',
          model: 'test-model',
          uri: 'modelscope://test-model',
          conflictResolution: 'overwrite', // 这个值应该被环境变量覆盖
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

      // 设置环境变量
      const originalValue = process.env.MODEL_CONFLIC_HANDLING;
      process.env.MODEL_CONFLIC_HANDLING = 'skip';

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

      // 现在使用了重试函数，所以检查重试函数是否被调用
      expect(mockRetryFileManagerRsyncAndCheckStatus).toHaveBeenCalled();

      // 恢复环境变量
      process.env.MODEL_CONFLIC_HANDLING = originalValue;
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

      // 现在使用重试函数，我们需要模拟重试函数抛出错误
      mockRetryFileManagerRsyncAndCheckStatus.mockRejectedValue(
        new Error('fileManagerRsync error'),
      );

      await expect(modelService.downloadModel(name, params)).rejects.toThrow(
        'fileManagerRsync error',
      );
      expect(mockInitClient).toHaveBeenCalled();
      expect(mockDevClient.listFileManagerTasks).toHaveBeenCalled();
      // 不再直接调用fileManagerRsync，而是使用重试函数
      expect(mockRetryFileManagerRsyncAndCheckStatus).toHaveBeenCalled();
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

      // 现在使用重试函数，所以直接模拟重试函数成功
      mockRetryFileManagerRm.mockResolvedValue(undefined);

      await expect(modelService.removeModel(name, params)).resolves.toBeUndefined();

      expect(mockInitClient).toHaveBeenCalled();
      // 现在使用重试函数，不再直接调用fileManagerRm
      expect(mockRetryFileManagerRm).toHaveBeenCalled();
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

      // 现在使用重试函数，我们需要模拟重试函数抛出错误
      mockRetryFileManagerRm.mockRejectedValue(
        new Error('[Remove-model] model: Remove failed ,requestId: undefined'),
      );

      await expect(modelService.removeModel(name, params)).rejects.toThrow(
        '[Remove-model] model: Remove failed ,requestId: undefined',
      );
      expect(mockInitClient).toHaveBeenCalled();
      // 现在使用重试函数，不再直接调用fileManagerRm
      expect(mockRetryFileManagerRm).toHaveBeenCalled();
    });

    it('should handle remove error with NoSuchFileError', async () => {
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

      // 现在使用重试函数，我们需要模拟重试函数在遇到NoSuchFileError时的行为
      mockRetryFileManagerRm.mockRejectedValue(new Error('NoSuchFileError: File does not exist'));

      await expect(modelService.removeModel(name, params)).rejects.toThrow('NoSuchFileError');
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

// 单独测试 extractOssMountDir 函数
describe('extractOssMountDir utility function', () => {
  let originalExtractOssMountDir: any;

  beforeAll(() => {
    // 取消对 utils 的 mock，以便测试原始函数
    jest.unmock('../../../src/subCommands/model/utils');
    originalExtractOssMountDir = require('../../../src/subCommands/model/utils').extractOssMountDir;
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

  it('should truncate mountDir if longer than 48 characters', () => {
    const ossMountPoints = [
      { mountDir: '/very-long-path-that-exceeds-the-character-limit-and-needs-to-be-truncated' },
      { mountDir: '/short' },
    ];

    const result = originalExtractOssMountDir(ossMountPoints);

    expect(result[0].mountDir).toBe('/very-long-path-that-exceeds-the-character-limit');
    expect(result[1].mountDir).toBe('/short');
  });

  it('should not modify mountDir if 48 characters or less', () => {
    const ossMountPoints = [
      { mountDir: '/exactly-48-characters-path-for-testing-purposes' },
      { mountDir: '/short' },
    ];

    const result = originalExtractOssMountDir(ossMountPoints);

    expect(result[0].mountDir).toBe('/exactly-48-characters-path-for-testing-purposes');
    expect(result[1].mountDir).toBe('/short');
  });

  it('should handle empty array', () => {
    const result = originalExtractOssMountDir([]);

    expect(result).toBeUndefined();
  });

  it('should handle undefined input', () => {
    const result = originalExtractOssMountDir(undefined);

    expect(result).toBeUndefined();
  });
});
