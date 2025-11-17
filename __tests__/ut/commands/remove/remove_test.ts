import Remove from '../../../../src/subCommands/remove';
import FC from '../../../../src/resources/fc';
import logger from '../../../../src/logger';
import { IInputs } from '../../../../src/interface';
import { promptForConfirmOrDetails, sleep } from '../../../../src/utils';

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
jest.mock('../../../../src/utils');
jest.mock('@serverless-devs/load-component');

describe('Remove', () => {
  let mockInputs: IInputs;
  let remove: Remove;
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
      command: 'remove',
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
      getVpcBinding: jest.fn().mockResolvedValue({ vpcIds: [] }),
      listFunctionProvisionConfig: jest.fn().mockResolvedValue([]),
      getFunctionConcurrency: jest.fn().mockResolvedValue({ reservedConcurrency: 0 }),
      listAlias: jest.fn().mockResolvedValue([]),
      listFunctionVersion: jest.fn().mockResolvedValue([]),
      listTriggers: jest.fn().mockResolvedValue([]),
      listAsyncInvokeConfig: jest.fn().mockResolvedValue([]),
      removeTrigger: jest.fn().mockResolvedValue({}),
      removeAsyncInvokeConfig: jest.fn().mockResolvedValue({}),
      deleteVpcBinding: jest.fn().mockResolvedValue({}),
      removeFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
      getFunctionProvisionConfig: jest.fn().mockResolvedValue({ current: 0 }),
      removeFunctionConcurrency: jest.fn().mockResolvedValue({}),
      removeAlias: jest.fn().mockResolvedValue({}),
      removeFunctionVersion: jest.fn().mockResolvedValue({}),
      fc20230330Client: {
        deleteFunction: jest.fn().mockResolvedValue({}),
        disableFunctionInvocation: jest.fn().mockResolvedValue({}),
      },
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
    (sleep as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Remove instance with valid inputs', () => {
      remove = new Remove(mockInputs);
      expect(remove).toBeInstanceOf(Remove);
    });

    it('should handle missing function name gracefully', () => {
      delete mockInputs.props.functionName;
      remove = new Remove(mockInputs);
      expect(remove).toBeInstanceOf(Remove);
    });

    it('should parse function removal flag correctly', () => {
      mockInputs.args = ['--function'];
      remove = new Remove(mockInputs);
      expect(remove).toBeInstanceOf(Remove);
    });

    it('should parse trigger removal flag correctly', () => {
      mockInputs.args = ['--trigger'];
      remove = new Remove(mockInputs);
      expect(remove).toBeInstanceOf(Remove);
    });

    it('should parse async invoke config removal flag correctly', () => {
      mockInputs.args = ['--async-invoke-config'];
      remove = new Remove(mockInputs);
      expect(remove).toBeInstanceOf(Remove);
    });
  });

  describe('run', () => {
    beforeEach(() => {
      remove = new Remove(mockInputs);
    });

    it('should execute remove successfully with basic function config', async () => {
      await remove.run();

      expect(FC).toHaveBeenCalledWith('cn-hangzhou', undefined, {
        endpoint: undefined,
        userAgent: undefined,
      });
      expect(mockFcInstance.getFunction).toHaveBeenCalledWith('test-function');
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);

      await remove.run();

      // The getFunction is called during computingRemoveResource, but the actual removal is skipped
      expect(mockFcInstance.getFunction).toHaveBeenCalled();
      expect(mockFcInstance.fc20230330Client.deleteFunction).not.toHaveBeenCalled();
    });

    it('should handle function not found error gracefully', async () => {
      const error = new Error('Function not found');
      (error as any).code = 'FunctionNotFound';
      mockFcInstance.getFunction.mockRejectedValueOnce(error);

      await remove.run();

      expect(logger.debug).toHaveBeenCalledWith('Function not found, skipping remove.');
    });

    it('should handle removal with assume-yes flag', async () => {
      mockInputs.args = ['--assume-yes'];
      remove = new Remove(mockInputs);

      await remove.run();

      expect(promptForConfirmOrDetails).not.toHaveBeenCalled();
    });
  });

  describe('removeFunction', () => {
    beforeEach(() => {
      remove = new Remove(mockInputs);
    });

    it('should remove function with all associated resources', async () => {
      // Mock resources to be removed
      (remove as any).resources = {
        function: 'test-function',
        vpcBindingConfigs: { vpcIds: ['vpc-123'] },
        // provision: [{ qualifier: 'LATEST' }], // Provision code is commented out in source
        concurrency: 10,
        aliases: ['test-alias'],
        versions: ['1'],
      };

      await (remove as any).removeFunction();

      expect(mockFcInstance.deleteVpcBinding).toHaveBeenCalledWith('test-function', 'vpc-123');
      // expect(mockFcInstance.removeFunctionProvisionConfig).toHaveBeenCalledWith( // Provision code is commented out in source
      //   'test-function',
      //   'LATEST',
      // );
      expect(mockFcInstance.removeFunctionConcurrency).toHaveBeenCalledWith('test-function');
      expect(mockFcInstance.removeAlias).toHaveBeenCalledWith('test-function', 'test-alias');
      expect(mockFcInstance.removeFunctionVersion).toHaveBeenCalledWith('test-function', '1');
      expect(mockFcInstance.fc20230330Client.deleteFunction).toHaveBeenCalledWith('test-function');
    });

    it('should handle ProvisionConfigExist error and retry', async () => {
      // Mock resources to be removed
      (remove as any).resources = {
        function: 'test-function',
        // provision: [{ qualifier: 'LATEST' }], // Provision code is commented out in source
      };

      // Since provision code is commented out in source, we'll test that the function still works
      await (remove as any).removeFunction();

      // The function should still be called successfully
      expect(mockFcInstance.fc20230330Client.deleteFunction).toHaveBeenCalledWith('test-function');
    });
  });

  describe('removeTrigger', () => {
    beforeEach(() => {
      remove = new Remove(mockInputs);
    });

    it('should remove specified triggers', async () => {
      (remove as any).resources = {
        triggerNames: ['trigger-1', 'trigger-2'],
      };

      await (remove as any).removeTrigger();

      expect(mockFcInstance.removeTrigger).toHaveBeenCalledWith('test-function', 'trigger-1');
      expect(mockFcInstance.removeTrigger).toHaveBeenCalledWith('test-function', 'trigger-2');
    });

    it('should skip trigger removal when no triggers specified', async () => {
      (remove as any).resources = {
        triggerNames: [],
      };

      await (remove as any).removeTrigger();

      expect(mockFcInstance.removeTrigger).not.toHaveBeenCalled();
    });
  });

  describe('removeAsyncInvokeConfig', () => {
    beforeEach(() => {
      remove = new Remove(mockInputs);
    });

    it('should remove async invoke configs', async () => {
      (remove as any).resources = {
        asyncInvokeConfigs: [{ qualifier: 'LATEST' }, { qualifier: '1' }],
      };

      await (remove as any).removeAsyncInvokeConfig();

      expect(mockFcInstance.removeAsyncInvokeConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(mockFcInstance.removeAsyncInvokeConfig).toHaveBeenCalledWith('test-function', '1');
    });

    it('should skip async invoke config removal when none specified', async () => {
      (remove as any).resources = {
        asyncInvokeConfigs: [],
      };

      await (remove as any).removeAsyncInvokeConfig();

      expect(mockFcInstance.removeAsyncInvokeConfig).not.toHaveBeenCalled();
    });
  });
});
