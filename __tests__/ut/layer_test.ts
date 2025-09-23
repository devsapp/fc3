import Layer from '../../src/subCommands/layer';
import FC from '../../src/resources/fc';
import logger from '../../src/logger';
import { IInputs } from '../../src/interface';
import fs from 'fs';
import path from 'path';
import { getRootHome } from '@serverless-devs/utils';
import zip from '@serverless-devs/zip';
import downloads from '@serverless-devs/downloads';
import { promptForConfirmOrDetails, calculateCRC64 } from '../../src/utils';

// Mock dependencies
jest.mock('../../src/resources/fc', () => {
  return {
    __esModule: true,
    default: Object.assign(
      jest.fn().mockImplementation(() => {
        return {
          listLayers: jest.fn().mockResolvedValue([
            {
              layerName: 'test-layer',
              description: 'Test layer',
              version: 1,
              compatibleRuntime: ['nodejs12'],
              layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
              acl: 'private',
            },
          ]),
          listLayerVersions: jest.fn().mockResolvedValue([
            {
              layerName: 'test-layer',
              description: 'Test layer',
              version: 1,
              compatibleRuntime: ['nodejs12'],
              layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
              acl: 'private',
            },
          ]),
          getLayerVersion: jest.fn().mockResolvedValue({
            layerName: 'test-layer',
            description: 'Test layer',
            version: 1,
            compatibleRuntime: ['nodejs12'],
            layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
            acl: 'private',
            code: {
              location: 'https://test.oss-cn-hangzhou.aliyuncs.com/layer.zip',
            },
          }),
          getLayerLatestVersion: jest.fn().mockResolvedValue(null),
          createLayerVersion: jest.fn().mockResolvedValue({
            layerName: 'test-layer',
            version: 1,
            layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          }),
          uploadCodeToTmpOss: jest.fn().mockResolvedValue({
            ossBucketName: 'test-bucket',
            ossObjectName: 'layer.zip',
          }),
          deleteLayerVersion: jest.fn().mockResolvedValue({}),
          putLayerACL: jest.fn().mockResolvedValue({}),
        };
      }),
      {
        // Add any static methods here if needed
      },
    ),
  };
});
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
    instance: {
      info: jest.fn(),
      debug: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  rmSync: jest.fn(),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  isAbsolute: jest.fn((p) => p.startsWith('/')),
}));

jest.mock('@serverless-devs/zip', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue({ outputFile: '/tmp/test.zip' }),
}));
jest.mock('@serverless-devs/downloads', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@serverless-devs/utils', () => ({
  parseArgv: jest.fn(),
  getRootHome: jest.fn(),
}));
jest.mock('../../src/utils', () => ({
  promptForConfirmOrDetails: jest.fn(),
  tableShow: jest.fn(),
  calculateCRC64: jest.fn(),
  getFileSize: jest.fn(),
}));

describe('Layer', () => {
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
      },
      command: 'layer',
      args: ['list'],
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
    };

    // Initialize mockFcInstance with empty mock functions
    mockFcInstance = {
      listLayers: jest.fn(),
      listLayerVersions: jest.fn(),
      getLayerVersion: jest.fn(),
      getLayerLatestVersion: jest.fn(),
      createLayerVersion: jest.fn(),
      uploadCodeToTmpOss: jest.fn(),
      deleteLayerVersion: jest.fn(),
      putLayerACL: jest.fn(),
    };

    // Set up the FC constructor mock to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    // Mock utils
    (getRootHome as jest.Mock).mockReturnValue('/root');
    (zip as jest.Mock).mockResolvedValue({ outputFile: '/tmp/test.zip' });
    (downloads as jest.Mock).mockResolvedValue(undefined);
    (calculateCRC64 as jest.Mock).mockResolvedValue('crc64checksum');
    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Layer instance with valid inputs for list command', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-hangzhou',
      });

      const layer = new Layer(mockInputs);
      expect(layer).toBeInstanceOf(Layer);
      expect(layer.subCommand).toBe('list');
    });

    it('should create Layer instance with valid inputs for publish command', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
      });

      const layer = new Layer(mockInputs);
      expect(layer).toBeInstanceOf(Layer);
      expect(layer.subCommand).toBe('publish');
    });

    it('should throw error when subCommand is not provided', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: [],
        region: 'cn-hangzhou',
      });

      expect(() => new Layer(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 layer -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['invalid'],
        region: 'cn-hangzhou',
      });

      expect(() => new Layer(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 layer -h" to query how to use the command',
      );
    });

    it('should handle region from command line args', () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-beijing',
      });

      const layer = new Layer(mockInputs);
      expect(layer).toBeInstanceOf(Layer);
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
      });

      expect(() => new Layer(mockInputs)).toThrow('Region not specified, please specify --region');
    });
  });

  describe('list', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-hangzhou',
      });
    });

    it('should list layers successfully', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayers.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      const layer = new Layer(mockInputs);
      const result = await layer.list();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        expect.any(Object),
        expect.objectContaining({
          userAgent: expect.stringContaining('command:layer'),
        }),
      );
      expect(mockFcInstance.listLayers).toHaveBeenCalledWith({ limit: 20 });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          layerName: 'test-layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
        }),
      );
    });

    it('should handle prefix filter', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayers.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-hangzhou',
        prefix: 'test',
      });

      const layer = new Layer(mockInputs);
      await layer.list();

      expect(mockFcInstance.listLayers).toHaveBeenCalledWith({
        limit: 20,
        prefix: 'test',
      });
    });

    it('should handle public filter', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayers.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-hangzhou',
        public: true,
      });

      const layer = new Layer(mockInputs);
      await layer.list();

      expect(mockFcInstance.listLayers).toHaveBeenCalledWith({
        limit: 20,
        public: 'true',
      });
    });

    it('should handle official filter', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayers.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['list'],
        region: 'cn-hangzhou',
        official: true,
      });

      const layer = new Layer(mockInputs);
      await layer.list();

      expect(mockFcInstance.listLayers).toHaveBeenCalledWith({
        limit: 20,
        official: 'true',
        public: 'true',
      });
    });
  });

  describe('info', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['info'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        'version-id': '1',
      });
    });

    it('should get layer info successfully', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.getLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        description: 'Test layer',
        version: 1,
        compatibleRuntime: ['nodejs12'],
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
        acl: 'private',
        code: {
          location: 'https://test.oss-cn-hangzhou.aliyuncs.com/layer.zip',
        },
      });

      const layer = new Layer(mockInputs);
      const result = await layer.info();

      expect(mockFcInstance.getLayerVersion).toHaveBeenCalledWith('test-layer', '1');
      expect(result).toEqual(
        expect.objectContaining({
          layerName: 'test-layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
        }),
      );
    });

    it('should throw error when layer name is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['info'],
        region: 'cn-hangzhou',
        'version-id': '1',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.info()).rejects.toThrow(
        'layerName not specified, please specify --layer-name',
      );
    });

    it('should throw error when version id is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['info'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.info()).rejects.toThrow(
        'version not specified, please specify --version-id',
      );
    });
  });

  describe('versions', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['versions'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
      });
    });

    it('should list layer versions successfully', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayerVersions.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      const layer = new Layer(mockInputs);
      const result = await layer.versions();

      expect(mockFcInstance.listLayerVersions).toHaveBeenCalledWith('test-layer');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          layerName: 'test-layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
        }),
      );
    });

    it('should throw error when layer name is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['versions'],
        region: 'cn-hangzhou',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.versions()).rejects.toThrow(
        'layerName not specified, please specify --layer-name',
      );
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        code: './code',
        'compatible-runtime': 'nodejs12,nodejs14',
      });
    });

    it('should publish layer successfully', async () => {
      // Set up the mocks to return the expected values
      mockFcInstance.getLayerLatestVersion.mockResolvedValue(null);
      mockFcInstance.uploadCodeToTmpOss.mockResolvedValue({
        ossBucketName: 'test-bucket',
        ossObjectName: 'layer.zip',
      });
      mockFcInstance.createLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        version: 1,
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
      });

      const layer = new Layer(mockInputs);
      const result = await layer.publish();

      expect(mockFcInstance.getLayerLatestVersion).toHaveBeenCalledWith('test-layer');
      expect(zip).toHaveBeenCalledWith({
        codeUri: '/test/./code',
        outputFileName: expect.stringContaining('cn-hangzhou_test-layer_'),
        outputFilePath: '/root/.s/fc/zip',
        ignoreFiles: ['.fcignore'],
        logger: expect.objectContaining({
          debug: expect.any(Function),
          info: expect.any(Function),
        }),
      });
      expect(mockFcInstance.uploadCodeToTmpOss).toHaveBeenCalledWith('/tmp/test.zip');
      expect(mockFcInstance.createLayerVersion).toHaveBeenCalledWith(
        'test-layer',
        'test-bucket',
        'layer.zip',
        ['nodejs12', 'nodejs14'],
        '',
      );
      expect(result).toEqual(
        expect.objectContaining({
          layerName: 'test-layer',
          version: 1,
        }),
      );
    });

    it('should skip upload when code is unchanged', async () => {
      mockFcInstance.getLayerLatestVersion.mockResolvedValue({
        codeChecksum: 'crc64checksum',
      });

      const layer = new Layer(mockInputs);
      const result = await layer.publish();

      expect(mockFcInstance.getLayerLatestVersion).toHaveBeenCalledWith('test-layer');
      expect(calculateCRC64).toHaveBeenCalledWith('/tmp/test.zip');
      expect(mockFcInstance.createLayerVersion).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          codeChecksum: 'crc64checksum',
        }),
      );
    });

    it('should handle zip file directly', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        code: './layer.zip',
        'compatible-runtime': 'nodejs12,nodejs14',
      });

      // Set up the mocks to return the expected values
      mockFcInstance.getLayerLatestVersion.mockResolvedValue(null);
      mockFcInstance.uploadCodeToTmpOss.mockResolvedValue({
        ossBucketName: 'test-bucket',
        ossObjectName: 'layer.zip',
      });
      mockFcInstance.createLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        version: 1,
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
      });

      const layer = new Layer(mockInputs);
      await layer.publish();

      expect(zip).not.toHaveBeenCalled();
      expect(mockFcInstance.uploadCodeToTmpOss).toHaveBeenCalledWith('/test/./layer.zip');
    });

    it('should throw error when layer name is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
        code: './code',
        'compatible-runtime': 'nodejs12',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.publish()).rejects.toThrow(
        'layerName not specified, please specify --layer-name',
      );
    });

    it('should throw error when code path is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        'compatible-runtime': 'nodejs12',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.publish()).rejects.toThrow(
        'layer code path not specified, please specify --code',
      );
    });

    it('should throw error when compatible runtime is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['publish'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        code: './code',
      });

      const layer = new Layer(mockInputs);
      await expect(layer.publish()).rejects.toThrow(
        'compatible runtime is not specified, please specify --compatible-runtime, for example "python3.9,python3.10"',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['remove'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        'assume-yes': true,
      });
    });

    it('should remove all layer versions successfully', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.listLayerVersions.mockResolvedValue([
        {
          layerName: 'test-layer',
          description: 'Test layer',
          version: 1,
          compatibleRuntime: ['nodejs12'],
          layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
          acl: 'private',
        },
      ]);

      const layer = new Layer(mockInputs);
      await layer.remove();

      expect(mockFcInstance.listLayerVersions).toHaveBeenCalledWith('test-layer');
      expect(mockFcInstance.deleteLayerVersion).toHaveBeenCalledWith('test-layer', 1);
    });

    it('should remove specific layer version successfully', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['remove'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        'version-id': '1',
        'assume-yes': true,
      });

      // Set up the mock to return the expected value
      mockFcInstance.deleteLayerVersion.mockResolvedValue({});

      const layer = new Layer(mockInputs);
      await layer.remove();

      expect(mockFcInstance.deleteLayerVersion).toHaveBeenCalledWith('test-layer', '1');
      expect(mockFcInstance.listLayerVersions).not.toHaveBeenCalled();
    });

    it('should throw error when layer name is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['remove'],
        region: 'cn-hangzhou',
        'assume-yes': true,
      });

      const layer = new Layer(mockInputs);
      await expect(layer.remove()).rejects.toThrow(
        'layerName not specified, please specify --layer-name',
      );
    });

    it('should skip removal when user declines confirmation', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['remove'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
      });
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);

      const layer = new Layer(mockInputs);
      await layer.remove();

      expect(mockFcInstance.deleteLayerVersion).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Skip remove layer: test-layer');
    });
  });

  describe('download', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['download'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        'version-id': '1',
      });
    });

    it('should download layer successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      (getRootHome as jest.Mock).mockReturnValueOnce('/root');

      // Set up the mock to return the expected value
      mockFcInstance.getLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        description: 'Test layer',
        version: 1,
        compatibleRuntime: ['nodejs12'],
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
        acl: 'private',
        code: {
          location: 'https://test.oss-cn-hangzhou.aliyuncs.com/layer.zip',
        },
      });

      const layer = new Layer(mockInputs);
      const result = await layer.download();

      expect(mockFcInstance.getLayerVersion).toHaveBeenCalledWith('test-layer', '1');
      expect(downloads).toHaveBeenCalledWith(
        'https://test.oss-cn-hangzhou.aliyuncs.com/layer.zip',
        {
          dest: '/root/cache/layers/123456789-cn-hangzhou-test-layer',
          filename: 1,
          extract: false,
        },
      );
      expect(result).toBe('/root/cache/layers/123456789-cn-hangzhou-test-layer/1.zip');
    });

    it('should skip download when file already exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (getRootHome as jest.Mock).mockReturnValueOnce('/root');

      // Set up the mock to return the expected value
      mockFcInstance.getLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        description: 'Test layer',
        version: 1,
        compatibleRuntime: ['nodejs12'],
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
        acl: 'private',
        code: {
          location: 'https://test.oss-cn-hangzhou.aliyuncs.com/layer.zip',
        },
      });

      const layer = new Layer(mockInputs);
      const result = await layer.download();

      expect(downloads).not.toHaveBeenCalled();
      expect(result).toBe('/root/cache/layers/123456789-cn-hangzhou-test-layer/1.zip');
    });
  });

  describe('acl', () => {
    beforeEach(() => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['acl'],
        region: 'cn-hangzhou',
        'layer-name': 'test-layer',
        public: true,
      });
    });

    it('should set layer acl successfully', async () => {
      // Set up the mock to return the expected value
      mockFcInstance.putLayerACL.mockResolvedValue({});

      const layer = new Layer(mockInputs);
      await layer.acl();

      expect(mockFcInstance.putLayerACL).toHaveBeenCalledWith('test-layer', 'true');
    });

    it('should throw error when layer name is not specified', async () => {
      (require('@serverless-devs/utils').parseArgv as jest.Mock).mockReturnValue({
        _: ['acl'],
        region: 'cn-hangzhou',
        public: true,
      });

      const layer = new Layer(mockInputs);
      await expect(layer.acl()).rejects.toThrow(
        'layerName not specified, please specify --layer-name',
      );
    });
  });

  describe('safe_publish_layer', () => {
    it('should publish layer with zip file', async () => {
      // Set up the mocks to return the expected values
      mockFcInstance.getLayerLatestVersion.mockResolvedValue(null);
      mockFcInstance.uploadCodeToTmpOss.mockResolvedValue({
        ossBucketName: 'test-bucket',
        ossObjectName: 'layer.zip',
      });
      mockFcInstance.createLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        version: 1,
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
      });

      const result = await Layer.safe_publish_layer(
        mockFcInstance,
        '/test/code.zip',
        'cn-hangzhou',
        'test-layer',
        ['nodejs12'],
        'Test layer description',
      );

      expect(mockFcInstance.getLayerLatestVersion).toHaveBeenCalledWith('test-layer');
      expect(mockFcInstance.uploadCodeToTmpOss).toHaveBeenCalledWith('/test/code.zip');
      expect(mockFcInstance.createLayerVersion).toHaveBeenCalledWith(
        'test-layer',
        'test-bucket',
        'layer.zip',
        ['nodejs12'],
        'Test layer description',
      );
      expect(result).toEqual(
        expect.objectContaining({
          layerName: 'test-layer',
          version: 1,
        }),
      );
    });

    it('should publish layer with directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      // Set up the mocks to return the expected values
      mockFcInstance.getLayerLatestVersion.mockResolvedValue(null);
      mockFcInstance.uploadCodeToTmpOss.mockResolvedValue({
        ossBucketName: 'test-bucket',
        ossObjectName: 'layer.zip',
      });
      mockFcInstance.createLayerVersion.mockResolvedValue({
        layerName: 'test-layer',
        version: 1,
        layerVersionArn: 'arn:acs:fc:cn-hangzhou:123456789:layers/test-layer/versions/1',
      });

      await Layer.safe_publish_layer(
        mockFcInstance,
        '/test/code',
        'cn-hangzhou',
        'test-layer',
        ['nodejs12'],
        'Test layer description',
      );

      expect(zip).toHaveBeenCalledWith({
        codeUri: '/test/code',
        outputFileName: expect.stringContaining('cn-hangzhou_test-layer_'),
        outputFilePath: '/root/.s/fc/zip',
        ignoreFiles: ['.fcignore'],
        logger: expect.any(Object),
      });
      expect(mockFcInstance.uploadCodeToTmpOss).toHaveBeenCalledWith('/tmp/test.zip');
    });
  });
});
