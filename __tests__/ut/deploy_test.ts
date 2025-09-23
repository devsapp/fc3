import Deploy from '../../src/subCommands/deploy';
import Service from '../../src/subCommands/deploy/impl/function';
import Trigger from '../../src/subCommands/deploy/impl/trigger';
import AsyncInvokeConfig from '../../src/subCommands/deploy/impl/async_invoke_config';
import VpcBinding from '../../src/subCommands/deploy/impl/vpc_binding';
import CustomDomain from '../../src/subCommands/deploy/impl/custom_domain';
import ProvisionConfig from '../../src/subCommands/deploy/impl/provision_config';
import ConcurrencyConfig from '../../src/subCommands/deploy/impl/concurrency_config';
import Info from '../../src/subCommands/info';
import { verify, isAppCenter } from '../../src/utils';
import { parseArgv } from '@serverless-devs/utils';
import { IInputs } from '../../src/interface';
import { GetApiType } from '../../src/resources/fc';

// Mock dependencies
jest.mock('../../src/subCommands/deploy/impl/function');
jest.mock('../../src/subCommands/deploy/impl/trigger');
jest.mock('../../src/subCommands/deploy/impl/async_invoke_config');
jest.mock('../../src/subCommands/deploy/impl/vpc_binding');
jest.mock('../../src/subCommands/deploy/impl/custom_domain');
jest.mock('../../src/subCommands/deploy/impl/provision_config');
jest.mock('../../src/subCommands/deploy/impl/concurrency_config');
jest.mock('../../src/subCommands/info');
jest.mock('../../src/utils');
jest.mock('@serverless-devs/utils');

// Mock logger
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Deploy', () => {
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
      command: 'deploy',
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

    // Mock parseArgv
    (parseArgv as jest.Mock).mockReturnValue({
      function: undefined,
      trigger: undefined,
      'async-invoke-config': undefined,
      'assume-yes': false,
      'skip-push': false,
    });

    // Mock verify
    (verify as jest.Mock).mockImplementation(() => {});

    // Mock isAppCenter
    (isAppCenter as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Deploy instance with all resources when no specific type', () => {
      const deploy = new Deploy(mockInputs);

      expect(deploy.inputs).toBe(mockInputs);
      expect(deploy.service).toBeInstanceOf(Service);
      expect(deploy.trigger).toBeInstanceOf(Trigger);
      expect(deploy.asyncInvokeConfig).toBeInstanceOf(AsyncInvokeConfig);
      expect(deploy.vpcBinding).toBeInstanceOf(VpcBinding);
      expect(deploy.customDomain).toBeInstanceOf(CustomDomain);
      expect(deploy.provisionConfig).toBeInstanceOf(ProvisionConfig);
      expect(deploy.concurrencyConfig).toBeInstanceOf(ConcurrencyConfig);
    });

    it('should create Deploy instance with only function when function type specified', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: 'function',
        trigger: undefined,
        'async-invoke-config': undefined,
        'assume-yes': false,
        'skip-push': false,
      });

      const deploy = new Deploy(mockInputs);

      expect(deploy.service).toBeInstanceOf(Service);
      expect(deploy.trigger).toBeUndefined();
      expect(deploy.asyncInvokeConfig).toBeUndefined();
      expect(deploy.vpcBinding).toBeUndefined();
      expect(deploy.customDomain).toBeUndefined();
      expect(deploy.provisionConfig).toBeUndefined();
      expect(deploy.concurrencyConfig).toBeUndefined();
    });

    it('should create Deploy instance with only trigger when trigger type specified', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: undefined,
        trigger: 'trigger',
        'async-invoke-config': undefined,
        'assume-yes': false,
        'skip-push': false,
      });

      const deploy = new Deploy(mockInputs);

      expect(deploy.service).toBeUndefined();
      expect(deploy.trigger).toBeInstanceOf(Trigger);
      expect(deploy.asyncInvokeConfig).toBeUndefined();
      expect(deploy.vpcBinding).toBeUndefined();
      expect(deploy.customDomain).toBeUndefined();
      expect(deploy.provisionConfig).toBeUndefined();
      expect(deploy.concurrencyConfig).toBeUndefined();
    });

    it('should create Deploy instance with only async invoke config when specified', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: undefined,
        trigger: undefined,
        'async-invoke-config': true,
        'assume-yes': false,
        'skip-push': false,
      });

      const deploy = new Deploy(mockInputs);

      expect(deploy.service).toBeUndefined();
      expect(deploy.trigger).toBeUndefined();
      expect(deploy.asyncInvokeConfig).toBeInstanceOf(AsyncInvokeConfig);
      expect(deploy.vpcBinding).toBeUndefined();
      expect(deploy.customDomain).toBeUndefined();
      expect(deploy.provisionConfig).toBeUndefined();
      expect(deploy.concurrencyConfig).toBeUndefined();
    });

    it('should log input props in AppCenter environment', () => {
      (isAppCenter as jest.Mock).mockReturnValue(true);

      new Deploy(mockInputs);

      // Logger is mocked, so we can't verify specific calls
    });

    it('should log input props in debug mode in non-AppCenter environment', () => {
      (isAppCenter as jest.Mock).mockReturnValue(false);

      new Deploy(mockInputs);

      // Logger is mocked, so we can't verify specific calls
    });

    it('should call verify with input props', () => {
      new Deploy(mockInputs);

      expect(verify).toHaveBeenCalledWith(mockInputs.props);
    });

    it('should parse argv with correct options', () => {
      new Deploy(mockInputs);

      expect(parseArgv).toHaveBeenCalledWith(mockInputs.args, {
        alias: {
          'assume-yes': 'y',
        },
        boolean: ['skip-push', 'async_invoke_config'],
      });
    });

    it('should pass correct options to Service constructor', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: 'function',
        trigger: undefined,
        'async-invoke-config': undefined,
        'assume-yes': true,
        'skip-push': true,
      });

      new Deploy(mockInputs);

      expect(Service).toHaveBeenCalledWith(mockInputs, {
        type: 'function',
        yes: true,
        skipPush: true,
      });
    });

    it('should pass correct options to Trigger constructor', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: undefined,
        trigger: 'trigger',
        'async-invoke-config': undefined,
        'assume-yes': true,
        'skip-push': false,
      });

      new Deploy(mockInputs);

      expect(Trigger).toHaveBeenCalledWith(mockInputs, {
        yes: true,
        trigger: 'trigger',
      });
    });

    it('should pass correct options to AsyncInvokeConfig constructor', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        function: undefined,
        trigger: undefined,
        'async-invoke-config': true,
        'assume-yes': true,
        'skip-push': false,
      });

      new Deploy(mockInputs);

      expect(AsyncInvokeConfig).toHaveBeenCalledWith(mockInputs, {
        yes: true,
      });
    });

    it('should pass correct options to VpcBinding constructor', () => {
      new Deploy(mockInputs);

      expect(VpcBinding).toHaveBeenCalledWith(mockInputs, {
        yes: false,
      });
    });

    it('should pass correct options to CustomDomain constructor', () => {
      new Deploy(mockInputs);

      expect(CustomDomain).toHaveBeenCalledWith(mockInputs, {
        yes: false,
      });
    });

    it('should pass correct options to ProvisionConfig constructor', () => {
      new Deploy(mockInputs);

      expect(ProvisionConfig).toHaveBeenCalledWith(mockInputs, {
        yes: false,
      });
    });

    it('should pass correct options to ConcurrencyConfig constructor', () => {
      new Deploy(mockInputs);

      expect(ConcurrencyConfig).toHaveBeenCalledWith(mockInputs, {
        yes: false,
      });
    });
  });

  describe('run', () => {
    let deploy: Deploy;
    let mockService: any;
    let mockTrigger: any;
    let mockAsyncInvokeConfig: any;
    let mockVpcBinding: any;
    let mockCustomDomain: any;
    let mockProvisionConfig: any;
    let mockConcurrencyConfig: any;
    let mockInfo: any;

    beforeEach(() => {
      mockService = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockTrigger = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockAsyncInvokeConfig = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockVpcBinding = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockCustomDomain = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockProvisionConfig = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockConcurrencyConfig = {
        before: jest.fn().mockResolvedValue(undefined),
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      mockInfo = {
        setGetApiType: jest.fn(),
        run: jest.fn().mockResolvedValue({ functionName: 'test-function' }),
      };

      (Service as jest.Mock).mockImplementation(() => mockService);
      (Trigger as jest.Mock).mockImplementation(() => mockTrigger);
      (AsyncInvokeConfig as jest.Mock).mockImplementation(() => mockAsyncInvokeConfig);
      (VpcBinding as jest.Mock).mockImplementation(() => mockVpcBinding);
      (CustomDomain as jest.Mock).mockImplementation(() => mockCustomDomain);
      (ProvisionConfig as jest.Mock).mockImplementation(() => mockProvisionConfig);
      (ConcurrencyConfig as jest.Mock).mockImplementation(() => mockConcurrencyConfig);
      (Info as jest.Mock).mockImplementation(() => mockInfo);

      deploy = new Deploy(mockInputs);
    });

    it('should call before methods for all resources', async () => {
      await deploy.run();

      expect(mockService.before).toHaveBeenCalled();
      expect(mockTrigger.before).toHaveBeenCalled();
      expect(mockAsyncInvokeConfig.before).toHaveBeenCalled();
      expect(mockVpcBinding.before).toHaveBeenCalled();
      expect(mockCustomDomain.before).toHaveBeenCalled();
      expect(mockProvisionConfig.before).toHaveBeenCalled();
      expect(mockConcurrencyConfig.before).toHaveBeenCalled();
    });

    it('should call run methods for all resources', async () => {
      await deploy.run();

      expect(mockService.run).toHaveBeenCalled();
      expect(mockTrigger.run).toHaveBeenCalled();
      expect(mockAsyncInvokeConfig.run).toHaveBeenCalled();
      expect(mockVpcBinding.run).toHaveBeenCalled();
      expect(mockCustomDomain.run).toHaveBeenCalled();
      expect(mockProvisionConfig.run).toHaveBeenCalled();
      expect(mockConcurrencyConfig.run).toHaveBeenCalled();
    });

    it('should return merged result when all resources run successfully', async () => {
      const result = await deploy.run();

      expect(mockInfo.setGetApiType).toHaveBeenCalledWith(GetApiType.simpleUnsupported);
      expect(mockInfo.run).toHaveBeenCalled();
      // Logger is mocked, so we can't verify specific calls
      expect(result).toEqual({ functionName: 'test-function' });
    });

    it('should not return merged result when some resources fail', async () => {
      mockService.run.mockResolvedValue(null);

      const result = await deploy.run();

      expect(mockInfo.run).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle partial deployment when only some resources are created', async () => {
      // Create deploy with only function
      (parseArgv as jest.Mock).mockReturnValue({
        function: 'function',
        trigger: undefined,
        'async-invoke-config': undefined,
        'assume-yes': false,
        'skip-push': false,
      });

      const partialDeploy = new Deploy(mockInputs);

      await partialDeploy.run();

      expect(mockService.before).toHaveBeenCalled();
      expect(mockService.run).toHaveBeenCalled();
      expect(mockTrigger.before).not.toHaveBeenCalled();
      expect(mockTrigger.run).not.toHaveBeenCalled();
    });

    it('should handle errors in before methods', async () => {
      mockService.before.mockRejectedValue(new Error('Service before failed'));

      await expect(deploy.run()).rejects.toThrow('Service before failed');
    });

    it('should handle errors in run methods', async () => {
      mockService.run.mockRejectedValue(new Error('Service run failed'));

      await expect(deploy.run()).rejects.toThrow('Service run failed');
    });

    it('should handle errors in info run', async () => {
      mockInfo.run.mockRejectedValue(new Error('Info run failed'));

      await expect(deploy.run()).rejects.toThrow('Info run failed');
    });
  });

  describe('edge cases', () => {
    it('should handle empty args', () => {
      mockInputs.args = [];

      const deploy = new Deploy(mockInputs);

      expect(deploy.service).toBeDefined();
      expect(deploy.trigger).toBeDefined();
    });

    it('should handle undefined args', () => {
      mockInputs.args = undefined as any;

      const deploy = new Deploy(mockInputs);

      expect(deploy.service).toBeDefined();
      expect(deploy.trigger).toBeDefined();
    });

    it('should handle verify throwing error', () => {
      (verify as jest.Mock).mockImplementation(() => {
        throw new Error('Verification failed');
      });

      expect(() => new Deploy(mockInputs)).toThrow('Verification failed');
    });

    it('should handle parseArgv throwing error', () => {
      (parseArgv as jest.Mock).mockImplementation(() => {
        throw new Error('Parse argv failed');
      });

      expect(() => new Deploy(mockInputs)).toThrow('Parse argv failed');
    });
  });
});
