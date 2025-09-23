import Sync from '../../src/subCommands/sync';
import FC, { GetApiType } from '../../src/resources/fc';
import { IInputs } from '../../src/interface';
import fs from 'fs';
import fs_extra from 'fs-extra';
import downloads from '@serverless-devs/downloads';

// Mock dependencies
jest.mock('../../src/resources/fc', () => {
  // Define GetApiType enum for the mock
  const GetApiType = {
    original: 'original',
    simple: 'simple',
    simpleUnsupported: 'simple-unsupported',
  };

  const mockFC = Object.assign(jest.fn(), {
    isCustomContainerRuntime: jest.fn().mockImplementation((runtime) => {
      return runtime === 'custom-container';
    }),
    GetApiType: GetApiType,
  });

  return {
    __esModule: true,
    default: mockFC,
    GetApiType: GetApiType,
  };
});
jest.mock('../../src/logger', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
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
  existsSync: jest.fn(),
  statSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('fs-extra', () => ({
  removeSync: jest.fn(),
}));

jest.mock('@serverless-devs/downloads');

describe('Sync', () => {
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
      command: 'sync',
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

    // Create mockFcInstance with proper mock functions
    mockFcInstance = {
      getFunction: jest.fn(),
      listTriggers: jest.fn(),
      getAsyncInvokeConfig: jest.fn(),
      getFunctionProvisionConfig: jest.fn(),
      getFunctionConcurrency: jest.fn(),
      getVpcBinding: jest.fn(),
      getFunctionCode: jest.fn(),
    };

    // Set up default mock return values
    mockFcInstance.getFunction.mockResolvedValue({
      functionName: 'test-function',
      runtime: 'nodejs18',
      handler: 'index.handler',
      code: {
        location: 'https://test.oss-cn-hangzhou.aliyuncs.com/code.zip',
      },
    });

    mockFcInstance.listTriggers.mockResolvedValue([
      {
        triggerName: 'httpTrigger',
        triggerType: 'http',
        description: 'HTTP trigger',
        qualifier: 'LATEST',
        invocationRole: 'acs:ram::123456789:role/fc-role',
        sourceArn: 'acs:oss:cn-hangzhou:123456789:bucket/test-bucket',
        triggerConfig: '{}',
      },
    ]);

    mockFcInstance.getAsyncInvokeConfig.mockResolvedValue({
      destinationConfig: {
        onSuccess: {
          destination: 'acs:fc:cn-hangzhou:123456789:functions/test-function',
        },
      },
    });

    mockFcInstance.getFunctionProvisionConfig.mockResolvedValue({
      target: 10,
      current: 5,
      functionArn: 'arn:acs:fc:cn-hangzhou:123456789:functions/test-function',
    });

    mockFcInstance.getFunctionConcurrency.mockResolvedValue({
      reservedConcurrency: 20,
      functionArn: 'arn:acs:fc:cn-hangzhou:123456789:functions/test-function',
    });

    mockFcInstance.getVpcBinding.mockResolvedValue({
      vpcIds: ['vpc-12345'],
    });

    mockFcInstance.getFunctionCode.mockResolvedValue({
      url: 'https://test.oss-cn-hangzhou.aliyuncs.com/code.zip',
    });

    // Set up the FC constructor mock to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    // Mock fs methods
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

    // Mock fs-extra methods
    (fs_extra.removeSync as jest.Mock).mockReturnValue(undefined);

    // Mock downloads
    (downloads as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Sync instance with valid inputs', () => {
      const sync = new Sync(mockInputs);
      expect(sync).toBeInstanceOf(Sync);
    });

    it('should throw error when function name is not specified', () => {
      delete mockInputs.props.functionName;
      expect(() => new Sync(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });

    it('should handle function name from command line args', () => {
      mockInputs.args = ['--function-name', 'cli-function'];
      const sync = new Sync(mockInputs);
      expect(sync).toBeInstanceOf(Sync);
    });

    it('should handle region from command line args', () => {
      mockInputs.props.region = undefined;
      mockInputs.args = ['--region', 'cn-beijing'];
      const sync = new Sync(mockInputs);
      expect(sync).toBeInstanceOf(Sync);
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      expect(() => new Sync(mockInputs)).toThrow('Region not specified, please specify --region');
    });

    it('should handle target directory from command line args', () => {
      mockInputs.args = ['--target-dir', './sync-test'];
      const sync = new Sync(mockInputs);
      expect(sync).toBeInstanceOf(Sync);
    });

    it('should throw error when target directory exists but is not a directory', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
      mockInputs.args = ['--target-dir', './sync-test'];

      expect(() => new Sync(mockInputs)).toThrow(
        '--target-dir "./sync-test" exists, but is not a directory',
      );
    });

    it('should handle qualifier from command line args', () => {
      mockInputs.args = ['--qualifier', '1'];
      const sync = new Sync(mockInputs);
      expect(sync).toBeInstanceOf(Sync);
    });
  });

  describe('getTriggers', () => {
    it('should get triggers successfully', async () => {
      const sync = new Sync(mockInputs);
      const result = await sync.getTriggers();

      expect(mockFcInstance.listTriggers).toHaveBeenCalledWith(
        'test-function',
        undefined,
        undefined,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          triggerName: 'httpTrigger',
          triggerType: 'http',
          description: 'HTTP trigger',
          qualifier: 'LATEST',
        }),
      );
    });

    it('should handle eventbridge trigger type', async () => {
      mockFcInstance.listTriggers.mockResolvedValueOnce([
        {
          triggerName: 'ebTrigger',
          triggerType: 'eventbridge',
          description: 'EventBridge trigger',
          qualifier: 'LATEST',
          triggerConfig: '{}',
        },
      ]);

      const sync = new Sync(mockInputs);
      const result = await sync.getTriggers();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          triggerName: 'ebTrigger',
          triggerType: 'eventbridge',
          description: 'EventBridge trigger',
          qualifier: 'LATEST',
        }),
      );
      // EventBridge triggers should not include invocationRole and sourceArn
      expect(result[0]).not.toHaveProperty('invocationRole');
      expect(result[0]).not.toHaveProperty('sourceArn');
    });
  });

  describe('run', () => {
    it('should sync function successfully', async () => {
      const sync = new Sync(mockInputs);
      const result = await sync.run();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        expect.any(Object),
        expect.objectContaining({
          userAgent: expect.stringContaining('command:sync'),
        }),
      );
      expect(mockFcInstance.getFunction).toHaveBeenCalledWith(
        'test-function',
        GetApiType.simpleUnsupported,
        undefined,
      );
      expect(mockFcInstance.listTriggers).toHaveBeenCalled();
      expect(mockFcInstance.getAsyncInvokeConfig).toHaveBeenCalled();
      expect(mockFcInstance.getFunctionProvisionConfig).toHaveBeenCalled();
      expect(mockFcInstance.getFunctionConcurrency).toHaveBeenCalled();
      expect(mockFcInstance.getVpcBinding).toHaveBeenCalled();
      expect(result).toHaveProperty('ymlPath');
      expect(result).toHaveProperty('codePath');
    });

    it('should handle custom container runtime', async () => {
      mockFcInstance.getFunction.mockResolvedValueOnce({
        functionName: 'test-function',
        runtime: 'custom-container',
        handler: 'index.handler',
        customContainerConfig: {
          image: 'test-image:latest',
          resolvedImageUri: 'test-image-resolved:latest',
        },
      });

      const sync = new Sync(mockInputs);
      await sync.run();

      expect(downloads).not.toHaveBeenCalled();
    });

    it('should handle function role', async () => {
      mockFcInstance.getFunction.mockResolvedValueOnce({
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        role: 'ACS:RAM::123456789:ROLE/FC-ROLE',
        code: {
          location: 'https://test.oss-cn-hangzhou.aliyuncs.com/code.zip',
        },
      });

      const sync = new Sync(mockInputs);
      await sync.run();

      expect(downloads).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should write sync files successfully', async () => {
      const sync = new Sync(mockInputs);
      const functionConfig = {
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        code: {
          location: 'https://test.oss-cn-hangzhou.aliyuncs.com/code.zip',
        },
      };
      const triggers = [
        {
          triggerName: 'httpTrigger',
          triggerType: 'http',
          description: 'HTTP trigger',
          qualifier: 'LATEST',
        },
      ];
      const asyncInvokeConfig = {
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:functions/test-function',
          },
        },
      };
      const vpcBindingConfig = {
        vpcIds: ['vpc-12345'],
      };
      const concurrencyConfig = {
        reservedConcurrency: 20,
      };
      const provisionConfig = {
        target: 10,
        current: 5,
        currentError: '',
        functionArn: 'arn:acs:fc:cn-hangzhou:123456789:functions/test-function',
      };

      const result = await sync.write(
        functionConfig,
        triggers,
        asyncInvokeConfig,
        vpcBindingConfig,
        concurrencyConfig,
        provisionConfig,
      );

      expect(fs_extra.removeSync).toHaveBeenCalledWith(
        expect.stringContaining('cn-hangzhou_test-function'),
      );
      expect(downloads).toHaveBeenCalledWith('https://test.oss-cn-hangzhou.aliyuncs.com/code.zip', {
        dest: expect.stringContaining('cn-hangzhou_test-function'),
        extract: true,
      });
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('sync-clone'), {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toHaveProperty('ymlPath');
      expect(result).toHaveProperty('codePath');
    });

    it('should handle custom container runtime in write method', async () => {
      const sync = new Sync(mockInputs);
      const functionConfig = {
        functionName: 'test-function',
        runtime: 'custom-container',
        handler: 'index.handler',
        customContainerConfig: {
          image: 'test-image:latest',
          resolvedImageUri: 'test-image-resolved:latest',
        },
      };

      await sync.write(functionConfig, [], {}, {}, {}, {});

      expect(downloads).not.toHaveBeenCalled();
      expect(fs_extra.removeSync).not.toHaveBeenCalled();
    });

    it('should handle target directory from command line args', async () => {
      mockInputs.args = ['--target-dir', '/custom/target'];
      const sync = new Sync(mockInputs);

      await sync.write(
        {
          functionName: 'test-function',
          runtime: 'nodejs18',
          handler: 'index.handler',
        },
        [],
        {},
        {},
        {},
        {},
      );

      expect(fs.mkdirSync).toHaveBeenCalledWith('/custom/target', { recursive: true });
    });
  });
});
