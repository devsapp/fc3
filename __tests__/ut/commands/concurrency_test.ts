import Concurrency from '../../../src/subCommands/concurrency';
import FC from '../../../src/resources/fc';
import logger from '../../../src/logger';
import { IInputs } from '../../../src/interface';
import { promptForConfirmOrDetails } from '../../../src/utils';

// Mock dependencies
jest.mock('../../../src/resources/fc');
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
jest.mock('../../../src/utils');

describe('Concurrency', () => {
  let mockInputs: IInputs;
  let concurrency: Concurrency;
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
      command: 'concurrency',
      args: ['get'],
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
      getFunctionConcurrency: jest.fn().mockResolvedValue({ reservedConcurrency: 10 }),
      putFunctionConcurrency: jest.fn().mockResolvedValue({ success: true }),
      removeFunctionConcurrency: jest.fn().mockResolvedValue({}),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Concurrency instance with valid inputs for get command', () => {
      concurrency = new Concurrency(mockInputs);
      expect(concurrency).toBeInstanceOf(Concurrency);
      expect(concurrency.subCommand).toBe('get');
    });

    it('should create Concurrency instance with valid inputs for put command', () => {
      mockInputs.args = ['put', '--reserved-concurrency', '10'];
      concurrency = new Concurrency(mockInputs);
      expect(concurrency).toBeInstanceOf(Concurrency);
      expect(concurrency.subCommand).toBe('put');
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Concurrency(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 concurrency -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Concurrency(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 concurrency -h" to query how to use the command',
      );
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      mockInputs.args = ['get'];
      expect(() => new Concurrency(mockInputs)).toThrow('Region not specified');
    });

    it('should throw error when functionName is not specified', () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['get'];
      expect(() => new Concurrency(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });

    it('should parse reservedConcurrency as number', () => {
      mockInputs.args = ['put', '--reserved-concurrency', '20'];
      concurrency = new Concurrency(mockInputs);
      expect((concurrency as any).reservedConcurrency).toBe(20);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      mockInputs.args = ['get'];
      concurrency = new Concurrency(mockInputs);
    });

    it('should get concurrency configuration', async () => {
      const result = await concurrency.get();
      expect(result).toBeDefined();
      expect(mockFcInstance.getFunctionConcurrency).toHaveBeenCalledWith('test-function');
    });
  });

  describe('put', () => {
    beforeEach(() => {
      mockInputs.args = ['put', '--reserved-concurrency', '15'];
      concurrency = new Concurrency(mockInputs);
    });

    it('should put concurrency configuration', async () => {
      const result = await concurrency.put();
      expect(result).toBeDefined();
      expect(mockFcInstance.putFunctionConcurrency).toHaveBeenCalledWith('test-function', 15);
    });

    it('should throw error when reservedConcurrency is not a number', async () => {
      mockInputs.args = ['put'];
      concurrency = new Concurrency(mockInputs);
      await expect(concurrency.put()).rejects.toThrow(
        'ReservedConcurrency must be a number, got undefined. Please specify a number through --reserved-concurrency <number>',
      );
    });

    it('should throw error when reservedConcurrency is NaN', async () => {
      mockInputs.args = ['put', '--reserved-concurrency', 'invalid'];
      concurrency = new Concurrency(mockInputs);
      await expect(concurrency.put()).rejects.toThrow(
        'ReservedConcurrency must be a number, got NaN. Please specify a number through --reserved-concurrency <number>',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockInputs.args = ['remove', '--assume-yes'];
      concurrency = new Concurrency(mockInputs);
    });

    it('should remove concurrency configuration', async () => {
      const result = await concurrency.remove();
      expect(result).toBeDefined();
      expect(mockFcInstance.removeFunctionConcurrency).toHaveBeenCalledWith('test-function');
    });

    it('should prompt for confirmation when --assume-yes is not provided', async () => {
      mockInputs.args = ['remove'];
      concurrency = new Concurrency(mockInputs);
      await concurrency.remove();
      expect(promptForConfirmOrDetails).toHaveBeenCalledWith(
        'Are you sure you want to delete the test-function function concurrency?',
      );
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);
      mockInputs.args = ['remove'];
      concurrency = new Concurrency(mockInputs);
      await concurrency.remove();
      expect(mockFcInstance.removeFunctionConcurrency).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Skip remove test-function function concurrency');
    });
  });
});
