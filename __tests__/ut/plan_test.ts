import Plan from '../../src/subCommands/plan';
import FC from '../../src/resources/fc';
import logger from '../../src/logger';
import { IInputs } from '../../src/interface';

// Mock dependencies
jest.mock('../../src/resources/fc');
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
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});
jest.mock('@serverless-devs/load-component');
jest.mock('@serverless-devs/diff', () => ({
  diffConvertPlanYaml: jest.fn().mockImplementation((remote, local) => ({
    show: 'test diff',
    remote,
    local,
  })),
}));

describe('Plan', () => {
  let mockInputs: IInputs;
  let plan: Plan;
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
      command: 'plan',
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
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
      }),
    };

    // Mock FC methods
    mockFcInstance = {
      getFunction: jest.fn().mockResolvedValue({ functionName: 'test-function' }),
      getTrigger: jest.fn().mockResolvedValue({ triggerName: 'test-trigger' }),
      getAsyncInvokeConfig: jest.fn().mockResolvedValue({ qualifier: 'LATEST' }),
      getVpcBinding: jest.fn().mockResolvedValue({ vpcIds: ['vpc-123'] }),
      getFunctionProvisionConfig: jest.fn().mockResolvedValue({ target: 10 }),
      getFunctionConcurrency: jest.fn().mockResolvedValue({ reservedConcurrency: 5 }),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);
    // Mock static replaceFunctionConfig method
    FC.replaceFunctionConfig = jest.fn().mockImplementation((local, remote) => ({ local, remote }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Plan instance with valid inputs', () => {
      plan = new Plan(mockInputs);
      expect(plan).toBeInstanceOf(Plan);
      expect(plan.region).toBe('cn-hangzhou');
      expect(plan.functionName).toBe('test-function');
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      expect(() => new Plan(mockInputs)).toThrow('Region not specified');
    });

    it('should throw error when functionName is not specified', () => {
      delete mockInputs.props.functionName;
      expect(() => new Plan(mockInputs)).toThrow('Function name not specified');
    });

    it('should initialize triggers with default config', () => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: 'http',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      plan = new Plan(mockInputs);
      expect(plan.triggers).toHaveLength(1);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      plan = new Plan(mockInputs);
    });

    it('should execute plan successfully with basic function config', async () => {
      await plan.run();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        undefined,
        expect.objectContaining({
          userAgent: expect.stringContaining('command:plan'),
        }),
      );
      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle triggers when provided', async () => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: 'http',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      plan = new Plan(mockInputs);

      await plan.run();
      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle asyncInvokeConfig when provided', async () => {
      mockInputs.props.asyncInvokeConfig = {
        destinationConfig: {
          onSuccess: {
            destination: 'acs:fc:cn-hangzhou:123456789:functions/success-function',
          },
        },
      } as any;
      plan = new Plan(mockInputs);

      await plan.run();
      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle vpcBinding when provided', async () => {
      (mockInputs.props as any).vpcBinding = {
        vpcIds: ['vpc-123'],
      };
      plan = new Plan(mockInputs);

      await plan.run();
      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle provisionConfig when provided', async () => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 10,
      } as any;
      plan = new Plan(mockInputs);

      await plan.run();
      expect(logger.write).toHaveBeenCalled();
    });

    it('should handle concurrencyConfig when provided', async () => {
      mockInputs.props.concurrencyConfig = {
        reservedConcurrency: 5,
      } as any;
      plan = new Plan(mockInputs);

      await plan.run();
      expect(logger.write).toHaveBeenCalled();
    });
  });

  describe('planFunction', () => {
    beforeEach(() => {
      plan = new Plan(mockInputs);
    });

    it('should plan function configuration', async () => {
      const result = await (plan as any).planFunction();
      expect(result).toBeDefined();
    });

    it('should handle FunctionNotFound error gracefully', async () => {
      const error = new Error('Function not found');
      (error as any).code = 'FunctionNotFound';
      mockFcInstance.getFunction.mockRejectedValueOnce(error);

      const result = await (plan as any).planFunction();
      expect(result).toBeDefined();
    });
  });

  describe('planTriggers', () => {
    beforeEach(() => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: 'http',
          triggerConfig: {
            authType: 'anonymous',
            methods: ['GET'],
          },
        },
      ];
      plan = new Plan(mockInputs);
    });

    it('should plan triggers configuration', async () => {
      const result = await (plan as any).planTriggers();
      expect(result).toBeDefined();
    });

    it('should handle TriggerNotFound error gracefully', async () => {
      const error = new Error('Trigger not found');
      (error as any).code = 'TriggerNotFound';
      mockFcInstance.getTrigger.mockRejectedValueOnce(error);

      const result = await (plan as any).planTriggers();
      expect(result).toBeDefined();
    });
  });

  describe('planAsyncInvokeConfig', () => {
    beforeEach(() => {
      mockInputs.props.asyncInvokeConfig = {
        qualifier: 'LATEST',
      } as any;
      plan = new Plan(mockInputs);
    });

    it('should plan async invoke configuration', async () => {
      const result = await (plan as any).planAsyncInvokeConfig();
      expect(result).toBeDefined();
    });
  });

  describe('planVpcBinding', () => {
    beforeEach(() => {
      (mockInputs.props as any).vpcBinding = {
        vpcIds: ['vpc-123'],
      };
      plan = new Plan(mockInputs);
    });

    it('should plan VPC binding configuration', async () => {
      const result = await (plan as any).planVpcBinding();
      expect(result).toBeDefined();
    });
  });

  describe('planProvisionConfig', () => {
    beforeEach(() => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 10,
      } as any;
      plan = new Plan(mockInputs);
    });

    it('should plan provision configuration', async () => {
      const result = await (plan as any).planProvisionConfig();
      expect(result).toBeDefined();
    });
  });

  describe('planConcurrencyConfig', () => {
    beforeEach(() => {
      mockInputs.props.concurrencyConfig = {
        reservedConcurrency: 5,
      } as any;
      plan = new Plan(mockInputs);
    });

    it('should plan concurrency configuration', async () => {
      const result = await (plan as any).planConcurrencyConfig();
      expect(result).toBeDefined();
    });
  });

  describe('planCustomDomain', () => {
    beforeEach(() => {
      (mockInputs.props as any).customDomain = {
        domainName: 'test.example.com',
        protocol: 'HTTP',
        route: {
          path: '/test',
          serviceName: 'test-service',
          functionName: 'test-function',
        },
      };
      plan = new Plan(mockInputs);
    });

    it('should plan custom domain configuration', async () => {
      const loadComponent = require('@serverless-devs/load-component');
      const mockDomainInstance = {
        info: jest.fn().mockResolvedValue({
          domainName: 'test.example.com',
          routeConfig: {
            routes: [],
          },
        }),
        plan: jest.fn().mockResolvedValue({}),
      };
      loadComponent.default = jest.fn().mockResolvedValue(mockDomainInstance);

      const result = await (plan as any).planCustomDomain();
      expect(result).toBeDefined();
    });

    it('should handle empty custom domain', async () => {
      delete (mockInputs.props as any).customDomain;
      plan = new Plan(mockInputs);

      const result = await (plan as any).planCustomDomain();
      expect(result).toEqual({});
    });
  });
});
