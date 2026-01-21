import { Model } from '../../../src/subCommands/model/index';
import { IInputs } from '../../../src/interface';
import { ModelService } from '../../../src/subCommands/model/model';
import { ArtModelService } from '../../../src/subCommands/model/fileManager';
import FC from '../../../src/resources/fc';
import VPC_NAS from '../../../src/resources/vpc-nas';
import OSS from '../../../src/resources/oss';
import getUuid from 'uuid-by-string';
import { MODEL_DOWNLOAD_TIMEOUT } from '../../../src/subCommands/model/constants';

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

jest.mock('../../../src/resources/fc');
jest.mock('../../../src/resources/vpc-nas');
jest.mock('../../../src/resources/oss');
jest.mock('../../../src/subCommands/model/model');
jest.mock('../../../src/subCommands/model/fileManager');
jest.mock('@alicloud/devs20230714');
jest.mock('@alicloud/openapi-client');
jest.mock('uuid-by-string');
jest.mock('../../../src/default/resources', () => ({
  getEnvVariable: jest.fn((key) => {
    switch (key) {
      case 'ALIYUN_DEVS_REMOTE_PROJECT_NAME':
        return 'test-project';
      case 'ALIYUN_DEVS_REMOTE_ENV_NAME':
        return 'test-env';
      default:
        return undefined;
    }
  }),
}));

// Mock parseArgv to control command parsing
jest.mock('@serverless-devs/utils', () => ({
  parseArgv: jest.fn().mockReturnValue({ _: ['download'] }),
}));

describe('Model', () => {
  let model: Model;
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
        annotations: {
          modelConfig: {
            solution: 'default',
            id: 'test-model',
            source: {
              uri: 'modelscope://test-model',
            },
            target: {
              uri: 'nas://auto',
            },
            version: '1.0.0',
            files: [],
            downloadStrategy: {
              conflictResolution: 'overwrite',
              mode: 'once',
              timeout: 30,
            },
          },
        },
        supplement: {}, // 添加supplement字段
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
      credential: {
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
        SecurityToken: 'test-token',
      },
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
        SecurityToken: 'test-token',
      }),
      userAgent: 'test-agent',
    };

    (getUuid as jest.Mock).mockReturnValue('uuid-test');
    (FC.computeLocalAuto as jest.Mock).mockReturnValue({
      nasAuto: false,
      vpcAuto: false,
      ossAuto: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with valid inputs', () => {
      model = new Model(mockInputs);

      expect(model.subCommand).toBe('download');
      expect(model.local).toEqual(mockInputs.props);
      expect(model.name).toBe('test-project');
    });

    it('should throw error for invalid subCommand', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValueOnce({
        _: ['invalid'],
      });

      expect(() => new Model(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 layer -h" to query how to use the command',
      );
    });
  });

  describe('download', () => {
    beforeEach(() => {
      model = new Model(mockInputs);
    });

    it('should call ModelService.downloadModel for default solution', async () => {
      const mockModelService = {
        downloadModel: jest.fn().mockResolvedValue(undefined),
      };

      (ModelService as jest.Mock).mockImplementation(() => mockModelService);

      await model.download();

      expect(mockModelService.downloadModel).toHaveBeenCalled();
    });

    it('should call ArtModelService.downloadModel for funArt solution', async () => {
      mockInputs.props.annotations.modelConfig.solution = 'funArt';
      model = new Model(mockInputs);

      const mockArtModelService = {
        downloadModel: jest.fn().mockResolvedValue(undefined),
      };

      (ArtModelService as jest.Mock).mockImplementation(() => mockArtModelService);

      await model.download();

      expect(mockArtModelService.downloadModel).toHaveBeenCalled();
    });

    it('should call ArtModelService.downloadModel for funModel solution', async () => {
      mockInputs.props.annotations.modelConfig.solution = 'funModel';
      model = new Model(mockInputs);

      const mockArtModelService = {
        downloadModel: jest.fn().mockResolvedValue(undefined),
      };

      (ArtModelService as jest.Mock).mockImplementation(() => mockArtModelService);

      await model.download();

      expect(mockArtModelService.downloadModel).toHaveBeenCalled();
    });

    it('should handle download error', async () => {
      const mockModelService = {
        downloadModel: jest.fn().mockRejectedValue(new Error('Download failed')),
      };

      (ModelService as jest.Mock).mockImplementation(() => mockModelService);

      await expect(model.download()).rejects.toThrow('download model error: Download failed');
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      model = new Model(mockInputs);
    });

    it('should call ModelService.removeModel for default solution', async () => {
      const mockModelService = {
        removeModel: jest.fn().mockResolvedValue(undefined),
      };

      (ModelService as jest.Mock).mockImplementation(() => mockModelService);

      await model.remove();

      expect(mockModelService.removeModel).toHaveBeenCalled();
    });

    it('should call ArtModelService.removeModel for funArt solution', async () => {
      mockInputs.props.annotations.modelConfig.solution = 'funArt';
      model = new Model(mockInputs);

      const mockArtModelService = {
        removeModel: jest.fn().mockResolvedValue(undefined),
      };

      (ArtModelService as jest.Mock).mockImplementation(() => mockArtModelService);

      await model.remove();

      expect(mockArtModelService.removeModel).toHaveBeenCalled();
    });

    it('should call ArtModelService.removeModel for funModel solution', async () => {
      mockInputs.props.annotations.modelConfig.solution = 'funModel';
      model = new Model(mockInputs);

      const mockArtModelService = {
        removeModel: jest.fn().mockResolvedValue(undefined),
      };

      (ArtModelService as jest.Mock).mockImplementation(() => mockArtModelService);

      await model.remove();

      expect(mockArtModelService.removeModel).toHaveBeenCalled();
    });

    it('should handle remove error', async () => {
      const mockModelService = {
        removeModel: jest.fn().mockRejectedValue(new Error('Remove failed')),
      };

      (ModelService as jest.Mock).mockImplementation(() => mockModelService);

      await expect(model.remove()).rejects.toThrow(
        '[Remove-model] delete model error: Remove failed',
      );
    });

    it('should ignore remove error when IGNORE_MODEL_REMOVE_ERROR is set', async () => {
      const originalValue = process.env.IGNORE_MODEL_REMOVE_ERROR;
      process.env.IGNORE_MODEL_REMOVE_ERROR = 'true';

      const mockModelService = {
        removeModel: jest.fn().mockRejectedValue(new Error('Remove failed')),
      };

      (ModelService as jest.Mock).mockImplementation(() => mockModelService);

      await expect(model.remove()).resolves.toBeUndefined();

      process.env.IGNORE_MODEL_REMOVE_ERROR = originalValue;
    });
  });

  describe('getModelService', () => {
    it('should create and return ModelService instance', async () => {
      model = new Model(mockInputs);
      const service = await (model as any).getModelService();

      // Since we're mocking the import, we expect an object rather than an instance
      expect(service).toBeDefined();
    });
  });

  describe('getModelArtService', () => {
    it('should create and return ArtModelService instance', async () => {
      model = new Model(mockInputs);
      const service = await (model as any).getModelArtService();

      // Since we're mocking the import, we expect an object rather than an instance
      expect(service).toBeDefined();
    });
  });

  describe('_assertArrayOfStrings', () => {
    it('should not throw for valid array of strings', () => {
      model = new Model(mockInputs);

      expect(() => (model as any)._assertArrayOfStrings(['a', 'b', 'c'])).not.toThrow();
    });

    it('should throw for non-array input', () => {
      model = new Model(mockInputs);

      expect(() => (model as any)._assertArrayOfStrings('not-an-array')).toThrow(
        'Variable must be an array',
      );
    });

    it('should throw for array with non-string elements', () => {
      model = new Model(mockInputs);

      expect(() => (model as any)._assertArrayOfStrings(['a', 1, 'c'])).toThrow(
        'Variable must contain only strings',
      );
    });
  });

  describe('getParams', () => {
    beforeEach(() => {
      model = new Model(mockInputs);
    });

    it('should throw error for empty modelConfig', async () => {
      mockInputs.props.annotations.modelConfig = {};
      model = new Model(mockInputs);

      await expect((model as any).getParams()).rejects.toThrow(
        '[Download-model] modelConfig is empty.',
      );
    });

    it('should handle OSS auto deployment', async () => {
      (FC.computeLocalAuto as jest.Mock).mockReturnValueOnce({
        nasAuto: false,
        vpcAuto: false,
        ossAuto: true,
      });

      const mockOSS = {
        deploy: jest.fn().mockResolvedValue({
          ossBucket: 'test-bucket',
          readOnly: true,
          mountDir: '/mnt/oss',
          bucketPath: '/',
        }),
      };

      (OSS as jest.Mock).mockImplementation(() => mockOSS);

      const params = await (model as any).getParams();

      expect(mockOSS.deploy).toHaveBeenCalled();
      expect(params.ossMountPoints).toBeDefined();
    });

    it('should handle NAS auto deployment', async () => {
      (FC.computeLocalAuto as jest.Mock).mockReturnValueOnce({
        nasAuto: true,
        vpcAuto: false,
        ossAuto: false,
      });

      const mockVPCNAS = {
        deploy: jest.fn().mockResolvedValue({
          vpcConfig: {
            vpcId: 'vpc-test',
            securityGroupId: 'sg-test',
            vSwitchIds: ['vsw-test'],
          },
          mountTargetDomain: 'test-domain',
          fileSystemId: 'fs-test',
        }),
      };

      (VPC_NAS as jest.Mock).mockImplementation(() => mockVPCNAS);

      const params = await (model as any).getParams();

      expect(mockVPCNAS.deploy).toHaveBeenCalled();
      expect(params.nasMountPoints).toBeDefined();
    });

    it('should build params correctly', async () => {
      const params = await (model as any).getParams();

      expect(params).toEqual({
        modelConfig: {
          model: 'test-model',
          source: {
            uri: 'modelscope://test-model',
          },
          uri: 'modelscope://test-model',
          target: {
            uri: 'nas://auto',
          },
          reversion: '1.0.0', // 实际实现中不会添加@符号，因为uri已经包含了协议
          files: [],
          conflictResolution: 'overwrite',
          mode: 'once',
          timeout: 30 * 1000,
          upgrade: {},
        },
        region: 'cn-hangzhou',
        functionName: 'test-function',
        storage: undefined,
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
      });
    });

    it('should handle modelscope:// protocol correctly', async () => {
      mockInputs.props.annotations.modelConfig.source.uri = 'modelscope://test-model';
      mockInputs.props.annotations.modelConfig.id = 'test-model';
      model = new Model(mockInputs);

      const params = await (model as any).getParams();

      expect(params.modelConfig.uri).toBe('modelscope://test-model');
      expect(params.modelConfig.source.uri).toBe('modelscope://test-model');
    });

    it('should handle modelscope protocol without // correctly', async () => {
      mockInputs.props.annotations.modelConfig.source.uri = 'modelscope:test-model';
      mockInputs.props.annotations.modelConfig.id = 'test-model';
      mockInputs.props.annotations.modelConfig.version = '1.0.0';
      model = new Model(mockInputs);

      const params = await (model as any).getParams();

      // 根据源代码逻辑，如果uri不是以modelscope://开头但包含modelscope，会转换为modelscope://格式
      expect(params.modelConfig.source.uri).toBe('modelscope:test-model');
    });

    it('should handle process.env.MODEL_DOWNLOAD_STRATEGY override', async () => {
      const originalValue = process.env.MODEL_DOWNLOAD_STRATEGY;
      process.env.MODEL_DOWNLOAD_STRATEGY = 'always';

      const params = await (model as any).getParams();

      expect(params.modelConfig.mode).toBe('always');

      process.env.MODEL_DOWNLOAD_STRATEGY = originalValue;
    });

    it('should handle download strategy conflict resolution', async () => {
      mockInputs.props.annotations.modelConfig.downloadStrategy.conflictResolution = 'skip';
      model = new Model(mockInputs);

      const params = await (model as any).getParams();

      expect(params.modelConfig.conflictResolution).toBe('skip');
    });

    it('should build params correctly when using supplement.modelConfig', async () => {
      const originalValue = process.env.MODEL_DOWNLOAD_STRATEGY;
      delete process.env.MODEL_DOWNLOAD_STRATEGY; // Clear any existing value

      mockInputs.props.supplement.modelConfig = {
        solution: 'default',
        id: 'test-model-supplement',
        source: {
          uri: 'modelscope://test-model-supplement',
        },
        target: {
          uri: 'nas://auto',
        },
        version: '2.0.0',
        files: [],
        downloadStrategy: {
          conflictResolution: 'skip',
          mode: 'always',
          timeout: 60,
        },
      };
      model = new Model(mockInputs);

      const params = await (model as any).getParams();

      expect(params).toEqual({
        modelConfig: {
          model: 'test-model-supplement',
          source: {
            uri: 'modelscope://test-model-supplement',
          },
          uri: 'modelscope://test-model-supplement',
          target: {
            uri: 'nas://auto',
          },
          reversion: '2.0.0', // 实际实现中不会添加@符号，因为uri已经包含了协议
          files: [],
          conflictResolution: 'skip',
          mode: 'always',
          timeout: 60 * 1000,
          upgrade: {},
        },
        region: 'cn-hangzhou',
        functionName: 'test-function',
        storage: undefined,
        role: 'acs:ram::123456789:role/aliyundevsdefaultrole',
      });

      process.env.MODEL_DOWNLOAD_STRATEGY = originalValue; // Restore original value
    });
  });

  describe('_validateModelConfig', () => {
    it('should not throw for valid modelConfig', () => {
      model = new Model(mockInputs);

      expect(() => (model as any)._validateModelConfig({ id: 'test' })).not.toThrow();
    });

    it('should throw for empty modelConfig', () => {
      model = new Model(mockInputs);

      expect(() => (model as any)._validateModelConfig({})).toThrow(
        '[Download-model] modelConfig is empty.',
      );
      expect(() => (model as any)._validateModelConfig(null)).toThrow(
        '[Download-model] modelConfig is empty.',
      );
      expect(() => (model as any)._validateModelConfig(undefined)).toThrow(
        '[Download-model] modelConfig is empty.',
      );
    });
  });

  describe('_handleOssAutoDeployment', () => {
    it('should deploy OSS resources correctly', async () => {
      model = new Model(mockInputs);

      const mockOSS = {
        deploy: jest.fn().mockResolvedValue({
          ossBucket: 'test-bucket',
          readOnly: true,
          mountDir: '/mnt/oss',
          bucketPath: '/',
        }),
      };

      (OSS as jest.Mock).mockImplementation(() => mockOSS);

      await (model as any)._handleOssAutoDeployment('cn-hangzhou', {});

      expect(mockOSS.deploy).toHaveBeenCalled();
      expect((model as any).createResource.oss).toEqual({ ossBucket: 'test-bucket' });
    });
  });

  describe('_handleNasAutoDeployment', () => {
    it('should deploy NAS resources correctly', async () => {
      model = new Model(mockInputs);

      const mockVPCNAS = {
        deploy: jest.fn().mockResolvedValue({
          vpcConfig: {
            vpcId: 'vpc-test',
            securityGroupId: 'sg-test',
            vSwitchIds: ['vsw-test'],
          },
          mountTargetDomain: 'test-domain',
          fileSystemId: 'fs-test',
        }),
      };

      (VPC_NAS as jest.Mock).mockImplementation(() => mockVPCNAS);

      await (model as any)._handleNasAutoDeployment(
        'cn-hangzhou',
        {},
        true,
        false,
        'test-function',
      );

      expect(mockVPCNAS.deploy).toHaveBeenCalledWith({
        nasAuto: true,
        vpcConfig: undefined,
      });

      expect((model as any).createResource.nas).toEqual({
        mountTargetDomain: 'test-domain',
        fileSystemId: 'fs-test',
      });
    });
  });

  describe('_buildParams', () => {
    it('should build params correctly with OSS mount points', () => {
      model = new Model(mockInputs);

      const params = (model as any)._buildParams(
        {
          id: 'test-model',
          source: { uri: 'modelscope://test-model' },
          target: { uri: 'nas://auto' },
          version: '1.0.0',
          files: [],
        },
        'cn-hangzhou',
        '123456789',
        undefined,
        undefined,
        { mountPoints: [{ bucketName: 'test-bucket' }] },
        'test-function',
      );

      expect(params.ossMountPoints).toEqual([{ bucketName: 'test-bucket' }]);
    });

    it('should build params correctly with NAS mount points', () => {
      model = new Model(mockInputs);

      const params = (model as any)._buildParams(
        {
          id: 'test-model',
          source: { uri: 'modelscope://test-model' },
          target: { uri: 'nas://auto' },
          version: '1.0.0',
          files: [],
        },
        'cn-hangzhou',
        '123456789',
        { mountPoints: [{ serverAddr: 'test-server' }] },
        { vpcId: 'vpc-test' },
        undefined,
        'test-function',
      );

      expect(params.nasMountPoints).toEqual([{ serverAddr: 'test-server' }]);
      expect(params.vpcConfig).toEqual({ vpcId: 'vpc-test' });
    });

    it('should use default timeout when not specified', () => {
      model = new Model(mockInputs);

      const params = (model as any)._buildParams(
        {
          id: 'test-model',
          source: { uri: 'modelscope://test-model' },
          target: { uri: 'nas://auto' },
          version: '1.0.0',
          files: [],
        },
        'cn-hangzhou',
        '123456789',
        undefined,
        undefined,
        undefined,
        'test-function',
      );

      expect(params.modelConfig.timeout).toBe(MODEL_DOWNLOAD_TIMEOUT);
    });

    it('should handle different download strategies', () => {
      const originalValue = process.env.MODEL_DOWNLOAD_STRATEGY;
      delete process.env.MODEL_DOWNLOAD_STRATEGY; // Clear any existing value

      model = new Model(mockInputs);

      const params = (model as any)._buildParams(
        {
          id: 'test-model',
          source: { uri: 'modelscope://test-model' },
          target: { uri: 'nas://auto' },
          version: '1.0.0',
          files: [],
          downloadStrategy: {
            conflictResolution: 'skip',
            mode: 'never',
            timeout: 120,
          },
        },
        'cn-hangzhou',
        '123456789',
        undefined,
        undefined,
        undefined,
        'test-function',
      );

      expect(params.modelConfig.conflictResolution).toBe('skip');
      expect(params.modelConfig.mode).toBe('never');
      expect(params.modelConfig.timeout).toBe(120 * 1000);

      process.env.MODEL_DOWNLOAD_STRATEGY = originalValue; // Restore original value
    });

    it('should use process.env.MODEL_DOWNLOAD_STRATEGY if provided', () => {
      const originalValue = process.env.MODEL_DOWNLOAD_STRATEGY;
      process.env.MODEL_DOWNLOAD_STRATEGY = 'always';

      model = new Model(mockInputs);

      const params = (model as any)._buildParams(
        {
          id: 'test-model',
          source: { uri: 'modelscope://test-model' },
          target: { uri: 'nas://auto' },
          version: '1.0.0',
          files: [],
          downloadStrategy: {
            conflictResolution: 'skip',
            mode: 'once',
            timeout: 120,
          },
        },
        'cn-hangzhou',
        '123456789',
        undefined,
        undefined,
        undefined,
        'test-function',
      );

      expect(params.modelConfig.mode).toBe('always');

      process.env.MODEL_DOWNLOAD_STRATEGY = originalValue;
    });
  });
});
