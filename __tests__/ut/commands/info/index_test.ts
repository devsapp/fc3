import Info from '../../../../src/subCommands/info';
import FC, { GetApiType } from '../../../../src/resources/fc';
import { IInputs } from '../../../../src/interface';
import loadComponent from '@serverless-devs/load-component';

// Mock dependencies
jest.mock('../../../../src/resources/fc');
jest.mock('../../../../src/logger', () => {
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
jest.mock('../../../../src/utils', () => ({
  getUserAgent: jest.fn(() => 'Component:fc3;command:info'),
  transformCustomDomainProps: jest.fn(() => ({ region: 'cn-hangzhou', domainName: 'auto' })),
}));
jest.mock('@serverless-devs/load-component');

describe('Info', () => {
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
      command: 'info',
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

    mockFcInstance = {
      getFunction: jest.fn().mockResolvedValue({
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
      }),
      getTrigger: jest.fn().mockResolvedValue({
        triggerName: 'httpTrigger',
        triggerType: 'http',
        qualifier: 'LATEST',
        httpTrigger: {
          urlInternet: 'https://internet.example.com',
          urlIntranet: 'https://intranet.example.com',
        },
        triggerConfig: {
          disableURLInternet: false,
        },
      }),
      getAsyncInvokeConfig: jest.fn().mockResolvedValue({ maxAsyncEventAgeInSeconds: 100 }),
      getVpcBinding: jest.fn().mockResolvedValue({ vpcIds: ['vpc-1'] }),
      getFunctionProvisionConfig: jest.fn().mockResolvedValue({ target: 2 }),
      getFunctionScalingConfig: jest.fn().mockResolvedValue({ minInstances: 1 }),
      getFunctionConcurrency: jest
        .fn()
        .mockResolvedValue({ reservedConcurrency: 5, functionArn: 'acs:fc:::arn' }),
    };

    (FC as any).mockImplementation(() => mockFcInstance);
    (loadComponent as jest.Mock).mockResolvedValue({
      info: jest.fn().mockResolvedValue({ domainName: 'custom.example.com' }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Info instance with valid inputs', () => {
      const info = new Info(mockInputs);
      expect(info).toBeInstanceOf(Info);
      expect(info.region).toBe('cn-hangzhou');
      expect(info.functionName).toBe('test-function');
      expect(info.getApiType).toBe(GetApiType.simple);
    });

    it('should read region and function-name from command line args', () => {
      mockInputs.props.region = undefined;
      mockInputs.props.functionName = undefined;
      mockInputs.args = ['--region', 'cn-beijing', '--function-name', 'cli-function'];
      const info = new Info(mockInputs);
      expect(info.region).toBe('cn-beijing');
      expect(info.functionName).toBe('cli-function');
    });

    it('should build triggersName list from props.triggers', () => {
      mockInputs.props.triggers = [{ triggerName: 't1' }, { triggerName: 't2' }] as any;
      const info = new Info(mockInputs);
      expect(info.triggersName).toEqual(['t1', 't2']);
    });

    it('should throw when scalingConfig and provisionConfig are both set', () => {
      mockInputs.props.scalingConfig = { minInstances: 1 } as any;
      mockInputs.props.provisionConfig = { target: 1 } as any;
      expect(() => new Info(mockInputs)).toThrow(
        'scalingConfig and provisionConfig cannot be used at the same time',
      );
    });

    it('should throw when region is not specified', () => {
      mockInputs.props.region = undefined;
      expect(() => new Info(mockInputs)).toThrow('Region not specified, please specify --region');
    });

    it('should throw when functionName is not specified', () => {
      mockInputs.props.functionName = undefined;
      expect(() => new Info(mockInputs)).toThrow(
        'functionName not specified, please specify --function-name',
      );
    });
  });

  describe('setGetApiType', () => {
    it('should update the getApiType value', () => {
      const info = new Info(mockInputs);
      info.setGetApiType(GetApiType.original);
      expect(info.getApiType).toBe(GetApiType.original);
    });
  });

  describe('getFunction', () => {
    it('should return the function config from the sdk', async () => {
      const info = new Info(mockInputs);
      const result = await info.getFunction();
      expect(mockFcInstance.getFunction).toHaveBeenCalledWith('test-function', GetApiType.simple);
      expect(result).toEqual(expect.objectContaining({ functionName: 'test-function' }));
    });
  });

  describe('getTriggers', () => {
    it('should return empty array when no triggers configured', async () => {
      const info = new Info(mockInputs);
      const result = await info.getTriggers();
      expect(result).toEqual([]);
      expect(mockFcInstance.getTrigger).not.toHaveBeenCalled();
    });

    it('should fetch each configured trigger', async () => {
      mockInputs.props.triggers = [{ triggerName: 't1' }] as any;
      const info = new Info(mockInputs);
      const result = await info.getTriggers();
      expect(mockFcInstance.getTrigger).toHaveBeenCalledWith(
        'test-function',
        't1',
        GetApiType.simple,
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getAsyncInvokeConfig', () => {
    it('should return {} when asyncInvokeConfig is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getAsyncInvokeConfig();
      expect(result).toEqual({});
      expect(mockFcInstance.getAsyncInvokeConfig).not.toHaveBeenCalled();
    });

    it('should fetch async config and attach the qualifier', async () => {
      mockInputs.props.asyncInvokeConfig = { qualifier: 'my-alias' } as any;
      const info = new Info(mockInputs);
      const result = await info.getAsyncInvokeConfig();
      expect(mockFcInstance.getAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'my-alias',
        GetApiType.simple,
      );
      expect(result.qualifier).toBe('my-alias');
    });
  });

  describe('getVpcBing', () => {
    it('should return {} when vpcBinding is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getVpcBing();
      expect(result).toEqual({});
      expect(mockFcInstance.getVpcBinding).not.toHaveBeenCalled();
    });

    it('should fetch vpc binding when configured', async () => {
      mockInputs.props.vpcBinding = { vpcIds: ['vpc-1'] } as any;
      const info = new Info(mockInputs);
      const result = await info.getVpcBing();
      expect(mockFcInstance.getVpcBinding).toHaveBeenCalledWith('test-function', GetApiType.simple);
      expect(result).toEqual({ vpcIds: ['vpc-1'] });
    });
  });

  describe('getProvisionConfig / getScalingConfig', () => {
    it('should return {} when provisionConfig is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getProvisionConfig();
      expect(result).toEqual({});
    });

    it('should fetch provision config when set', async () => {
      mockInputs.props.provisionConfig = { target: 2 } as any;
      const info = new Info(mockInputs);
      const result = await info.getProvisionConfig();
      expect(mockFcInstance.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(result).toEqual({ target: 2 });
    });

    it('should return {} when scalingConfig is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getScalingConfig();
      expect(result).toEqual({});
    });

    it('should fetch scaling config when set', async () => {
      mockInputs.props.scalingConfig = { minInstances: 1 } as any;
      const info = new Info(mockInputs);
      const result = await info.getScalingConfig();
      expect(mockFcInstance.getFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(result).toEqual({ minInstances: 1 });
    });
  });

  describe('getConcurrencyConfig', () => {
    it('should return {} when concurrencyConfig is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getConcurrencyConfig();
      expect(result).toEqual({});
    });

    it('should omit functionArn from the concurrency result', async () => {
      mockInputs.props.concurrencyConfig = { reservedConcurrency: 5 } as any;
      const info = new Info(mockInputs);
      const result = await info.getConcurrencyConfig();
      expect(mockFcInstance.getFunctionConcurrency).toHaveBeenCalledWith('test-function');
      expect(result).toEqual({ reservedConcurrency: 5 });
      expect(result).not.toHaveProperty('functionArn');
    });
  });

  describe('getCustomDomain', () => {
    it('should return {} when customDomain is not set', async () => {
      const info = new Info(mockInputs);
      const result = await info.getCustomDomain();
      expect(result).toEqual({});
      expect(loadComponent).not.toHaveBeenCalled();
    });

    it('should delegate to the fc3-domain component when customDomain is set', async () => {
      (mockInputs.props as any).customDomain = { domainName: 'auto' };
      const info = new Info(mockInputs);
      const result = await info.getCustomDomain();
      expect(loadComponent).toHaveBeenCalled();
      expect(result).toEqual({ domainName: 'custom.example.com' });
    });
  });

  describe('run', () => {
    it('should assemble info from function config only (no optional resources)', async () => {
      const info = new Info(mockInputs);
      const result = await info.run();

      expect(result.region).toBe('cn-hangzhou');
      expect(result.functionName).toBe('test-function');
      // Optional resources should be undefined when not configured
      expect(result.triggers).toBeUndefined();
      expect(result.asyncInvokeConfig).toBeUndefined();
      expect(result.vpcBinding).toBeUndefined();
      expect(result.customDomain).toBeUndefined();
      expect(result.url).toBeUndefined();
    });

    it('should attach system urls for a LATEST http trigger', async () => {
      mockInputs.props.triggers = [{ triggerName: 'httpTrigger' }] as any;
      const info = new Info(mockInputs);
      const result = await info.run();

      expect(result.url).toEqual({
        system_url: 'https://internet.example.com',
        system_intranet_url: 'https://intranet.example.com',
      });
      expect(result.triggers).toHaveLength(1);
    });

    it('should drop internet url when disableURLInternet is true', async () => {
      mockInputs.props.triggers = [{ triggerName: 'httpTrigger' }] as any;
      mockFcInstance.getTrigger.mockResolvedValue({
        triggerName: 'httpTrigger',
        triggerType: 'http',
        qualifier: 'LATEST',
        httpTrigger: {
          urlInternet: 'https://internet.example.com',
          urlIntranet: 'https://intranet.example.com',
        },
        triggerConfig: {
          disableURLInternet: true,
        },
      });
      const info = new Info(mockInputs);
      const result = await info.run();

      expect(result.url.system_url).toBeUndefined();
      expect(result.url.system_intranet_url).toBe('https://intranet.example.com');
    });

    it('should attach custom_domain to url when customDomain is configured', async () => {
      (mockInputs.props as any).customDomain = { domainName: 'auto' };
      const info = new Info(mockInputs);
      const result = await info.run();

      expect(result.url).toEqual({ custom_domain: 'custom.example.com' });
      expect(result.customDomain).toEqual({ domainName: 'custom.example.com' });
    });

    it('should propagate errors thrown by the sdk', async () => {
      mockFcInstance.getFunction.mockRejectedValueOnce(new Error('sdk boom'));
      const info = new Info(mockInputs);
      await expect(info.run()).rejects.toThrow('sdk boom');
    });
  });
});
