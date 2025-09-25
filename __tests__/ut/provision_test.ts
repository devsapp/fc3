import Provision from '../../src/subCommands/provision';
import FC from '../../src/resources/fc';
import logger from '../../src/logger';
import { IInputs } from '../../src/interface';
import { promptForConfirmOrDetails, sleep } from '../../src/utils';

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
jest.mock('../../src/utils');

describe('Provision', () => {
  let mockInputs: IInputs;
  let provision: Provision;
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
      command: 'provision',
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
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
      }),
    };

    // Mock FC methods
    mockFcInstance = {
      listFunctionProvisionConfig: jest.fn().mockResolvedValue([{ functionName: 'test-function' }]),
      getFunctionProvisionConfig: jest.fn().mockResolvedValue({ target: 10 }),
      putFunctionProvisionConfig: jest.fn().mockResolvedValue({ success: true }),
      removeFunctionProvisionConfig: jest.fn().mockResolvedValue({}),
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
    it('should create Provision instance with valid inputs for list command', () => {
      provision = new Provision(mockInputs);
      expect(provision).toBeInstanceOf(Provision);
      expect(provision.subCommand).toBe('list');
    });

    it('should create Provision instance with valid inputs for get command', () => {
      mockInputs.args = ['get', '--qualifier', 'LATEST'];
      provision = new Provision(mockInputs);
      expect(provision).toBeInstanceOf(Provision);
      expect(provision.subCommand).toBe('get');
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Provision(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 provision -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Provision(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 provision -h" to query how to use the command',
      );
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      mockInputs.args = ['list'];
      expect(() => new Provision(mockInputs)).toThrow('Region not specified');
    });

    it('should throw error when functionName is not specified', () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['list'];
      expect(() => new Provision(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });

    it('should parse command line arguments correctly', () => {
      mockInputs.args = [
        'put',
        '--function-name',
        'test-function',
        '--qualifier',
        'LATEST',
        '--target',
        '10',
      ];
      provision = new Provision(mockInputs);
      expect(provision.subCommand).toBe('put');
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockInputs.args = ['list'];
      provision = new Provision(mockInputs);
    });

    it('should list provision configurations', async () => {
      const result = await provision.list();
      expect(result).toBeDefined();
      expect(mockFcInstance.listFunctionProvisionConfig).toHaveBeenCalledWith('test-function');
    });
  });

  describe('get', () => {
    beforeEach(() => {
      mockInputs.args = ['get', '--qualifier', 'LATEST'];
      provision = new Provision(mockInputs);
    });

    it('should get provision configuration', async () => {
      const result = await provision.get();
      expect(result).toBeDefined();
      expect(mockFcInstance.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
    });

    it('should use default qualifier when qualifier is not specified', async () => {
      mockInputs.args = ['get'];
      provision = new Provision(mockInputs);
      // The current implementation uses 'LATEST' as default when qualifier is not specified
      await expect(provision.get()).resolves.toEqual({ target: 10 });
      expect(mockFcInstance.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST', // Default qualifier
      );
    });
  });

  describe('put', () => {
    beforeEach(() => {
      mockInputs.args = ['put', '--qualifier', 'LATEST', '--target', '10'];
      provision = new Provision(mockInputs);
    });

    it('should put provision configuration', async () => {
      const result = await provision.put();
      expect(result).toBeDefined();
      expect(mockFcInstance.putFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          target: 10,
        }),
      );
    });

    it('should use default qualifier when qualifier is not specified', async () => {
      mockInputs.args = ['put', '--target', '10'];
      provision = new Provision(mockInputs);
      // The current implementation uses 'LATEST' as default when qualifier is not specified
      await expect(provision.put()).resolves.toEqual({ success: true });
      expect(mockFcInstance.putFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST', // Default qualifier
        expect.objectContaining({
          target: 10,
        }),
      );
    });

    it('should throw error when target is not a number', async () => {
      mockInputs.args = ['put', '--qualifier', 'LATEST', '--target', 'invalid'];
      provision = new Provision(mockInputs);
      await expect(provision.put()).rejects.toThrow(
        'Target or defaultTarget must be a number, got NaN. Please specify a number through --target <number>',
      );
    });

    it('should parse scheduledActions JSON', async () => {
      mockInputs.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--target',
        '10',
        '--scheduled-actions',
        '[{"name":"test"}]',
      ];
      provision = new Provision(mockInputs);
      await provision.put();
      expect(mockFcInstance.putFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          scheduledActions: [{ name: 'test' }],
        }),
      );
    });

    it('should throw error when scheduledActions is not valid JSON', async () => {
      mockInputs.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--target',
        '10',
        '--scheduled-actions',
        'invalid-json',
      ];
      provision = new Provision(mockInputs);
      await expect(provision.put()).rejects.toThrow(
        'The incoming --scheduled-actions is not a JSON.',
      );
    });

    it('should parse targetTrackingPolicies JSON', async () => {
      mockInputs.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--target',
        '10',
        '--target-tracking-policies',
        '[{"name":"test"}]',
      ];
      provision = new Provision(mockInputs);
      await provision.put();
      expect(mockFcInstance.putFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          targetTrackingPolicies: [{ name: 'test' }],
        }),
      );
    });

    it('should throw error when targetTrackingPolicies is not valid JSON', async () => {
      mockInputs.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--target',
        '10',
        '--target-tracking-policies',
        'invalid-json',
      ];
      provision = new Provision(mockInputs);
      await expect(provision.put()).rejects.toThrow(
        'The incoming --target-tracking-policies is not a JSON.',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockInputs.args = ['remove', '--qualifier', 'LATEST', '--assume-yes'];
      provision = new Provision(mockInputs);
    });

    it('should remove provision configuration', async () => {
      await provision.remove();
      expect(mockFcInstance.removeFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
      expect(mockFcInstance.getFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
    });

    it('should use default qualifier when qualifier is not specified', async () => {
      mockInputs.args = ['remove', '--assume-yes'];
      provision = new Provision(mockInputs);
      // The current implementation uses 'LATEST' as default when qualifier is not specified
      await expect(provision.remove()).resolves.toBeUndefined();
      expect(mockFcInstance.removeFunctionProvisionConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST', // Default qualifier
      );
    });

    it('should prompt for confirmation when --assume-yes is not provided', async () => {
      mockInputs.args = ['remove', '--qualifier', 'LATEST'];
      provision = new Provision(mockInputs);
      await provision.remove();
      expect(promptForConfirmOrDetails).toHaveBeenCalledWith(
        'Are you sure you want to delete the test-function function provision?',
      );
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);
      mockInputs.args = ['remove', '--qualifier', 'LATEST'];
      provision = new Provision(mockInputs);
      await provision.remove();
      expect(mockFcInstance.removeFunctionProvisionConfig).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Skip remove test-function function provision');
    });
  });
});
