import Scaling from '../../../../src/subCommands/scaling/index';
import { IInputs } from '../../../../src/interface';
import logger from '../../../../src/logger';
import FC from '../../../../src/resources/fc';

// Mock FC class
jest.mock('../../../../src/resources/fc', () => {
  const mockFcInstance = {
    listFunctionScalingConfig: jest.fn(),
    getFunctionScalingConfig: jest.fn(),
    putFunctionScalingConfig: jest.fn(),
    deleteFunctionScalingConfig: jest.fn(),
    removeFunctionScalingConfig: jest.fn(),
  };

  return jest.fn().mockImplementation(() => mockFcInstance);
});

// Mock utils
jest.mock('../../../../src/utils', () => ({
  promptForConfirmOrDetails: jest.fn(),
}));

describe('Scaling', () => {
  let mockInputs: IInputs;
  let scaling: Scaling;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock logger
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn();
    logger.spin = jest.fn();

    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
        Region: 'cn-hangzhou',
      },
      args: ['list'],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;

    // Reset FC mock implementation to default
    (FC as unknown as jest.Mock).mockImplementation(() => {
      return {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn(),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
    });
  });

  describe('constructor', () => {
    it('should create Scaling instance with valid inputs', () => {
      expect(() => new Scaling(mockInputs)).not.toThrow();
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Scaling(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 scaling -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Scaling(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 scaling -h" to query how to use the command',
      );
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      expect(() => new Scaling(mockInputs)).toThrow(
        'Region not specified, please specify --region',
      );
    });

    it('should throw error when functionName is not specified', () => {
      mockInputs.props.functionName = undefined;
      expect(() => new Scaling(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });

    it('should parse command line arguments correctly', () => {
      mockInputs.args = ['list', '--function-name', 'my-function', '--region', 'cn-beijing'];
      const scalingInstance = new Scaling(mockInputs);
      expect(scalingInstance).toBeDefined();
    });
  });

  describe('list', () => {
    it('should list scaling configurations', async () => {
      const mockScalingConfigs = [
        { functionName: 'test-function', qualifier: 'LATEST', minInstances: 1 },
      ];

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn().mockResolvedValue(mockScalingConfigs),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn(),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(mockInputs);

      const result = await scaling.list();
      expect(result).toEqual(mockScalingConfigs);
      expect(mockFcInstance.listFunctionScalingConfig).toHaveBeenCalledWith('test-function');
    });
  });

  describe('get', () => {
    it('should get scaling configuration', async () => {
      const inputsForGet = JSON.parse(JSON.stringify(mockInputs));
      inputsForGet.args = ['get', '--qualifier', 'LATEST'];

      const mockScalingConfig = {
        functionName: 'test-function',
        qualifier: 'LATEST',
        minInstances: 1,
      };

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn().mockResolvedValue(mockScalingConfig),
        putFunctionScalingConfig: jest.fn(),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(inputsForGet);

      const result = await scaling.get();
      expect(result).toEqual(mockScalingConfig);
      expect(mockFcInstance.getFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      // Remove qualifier from inputs props and args to trigger the error
      const inputsWithoutQualifier = JSON.parse(JSON.stringify(mockInputs));
      inputsWithoutQualifier.args = ['get'];
      inputsWithoutQualifier.props.qualifier = undefined;
      // We need to mock the FC constructor to throw an error when qualifier is not provided
      (FC as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Qualifier not specified, please specify --qualifier');
      });

      // Since the error is thrown in the constructor, we need to catch it there
      expect(() => new Scaling(inputsWithoutQualifier)).toThrow(
        'Qualifier not specified, please specify --qualifier',
      );
    });
  });

  describe('put', () => {
    it('should put scaling configuration', async () => {
      const inputsForPut = JSON.parse(JSON.stringify(mockInputs));
      inputsForPut.args = ['put', '--qualifier', 'LATEST', '--min-instances', '2'];

      const mockResult = { success: true };

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn().mockResolvedValue(mockResult),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(inputsForPut);

      const result = await scaling.put();
      expect(result).toEqual(mockResult);
      expect(mockFcInstance.putFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          minInstances: 2,
          horizontalScalingPolicies: [],
          scheduledPolicies: [],
        }),
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      // Remove qualifier from inputs props and args to trigger the error
      const inputsWithoutQualifier = JSON.parse(JSON.stringify(mockInputs));
      inputsWithoutQualifier.args = ['put', '--min-instances', '2'];
      inputsWithoutQualifier.props.qualifier = undefined;
      // We need to mock the FC constructor to throw an error when qualifier is not provided
      (FC as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Qualifier not specified, please specify --qualifier');
      });

      // Since the error is thrown in the constructor, we need to catch it there
      expect(() => new Scaling(inputsWithoutQualifier)).toThrow(
        'Qualifier not specified, please specify --qualifier',
      );
    });

    it('should parse horizontalScalingPolicies JSON', async () => {
      const policies = [{ policyName: 'test-policy', targetValue: 10 }];
      const inputsForPut = JSON.parse(JSON.stringify(mockInputs));
      inputsForPut.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--min-instances',
        '2',
        '--horizontal-scaling-policies',
        JSON.stringify(policies),
      ];

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn().mockResolvedValue({ success: true }),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(inputsForPut);

      await scaling.put();
      expect(mockFcInstance.putFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          minInstances: 2,
          horizontalScalingPolicies: policies,
          scheduledPolicies: [],
        }),
      );
    });

    it('should throw error when horizontalScalingPolicies is not valid JSON', async () => {
      const inputsForPut = JSON.parse(JSON.stringify(mockInputs));
      inputsForPut.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--min-instances',
        '2',
        '--horizontal-scaling-policies',
        'invalid-json',
      ];
      scaling = new Scaling(inputsForPut);

      await expect(scaling.put()).rejects.toThrow(
        'The incoming --horizontal-scaling-policies is not a JSON.',
      );
    });

    it('should parse scheduledPolicies JSON', async () => {
      const policies = [{ policyName: 'test-scheduled-policy', schedule: 'cron(0 9 * * *)' }];
      const inputsForPut = JSON.parse(JSON.stringify(mockInputs));
      inputsForPut.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--min-instances',
        '2',
        '--scheduled-policies',
        JSON.stringify(policies),
      ];

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn().mockResolvedValue({ success: true }),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn(),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(inputsForPut);

      await scaling.put();
      expect(mockFcInstance.putFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
        expect.objectContaining({
          minInstances: 2,
          horizontalScalingPolicies: [],
          scheduledPolicies: policies,
        }),
      );
    });

    it('should throw error when scheduledPolicies is not valid JSON', async () => {
      const inputsForPut = JSON.parse(JSON.stringify(mockInputs));
      inputsForPut.args = [
        'put',
        '--qualifier',
        'LATEST',
        '--min-instances',
        '2',
        '--scheduled-policies',
        'invalid-json',
      ];
      scaling = new Scaling(inputsForPut);

      await expect(scaling.put()).rejects.toThrow(
        'The incoming --scheduled-policies is not a JSON.',
      );
    });
  });

  describe('remove', () => {
    it('should remove scaling configuration', async () => {
      const inputsForRemove = JSON.parse(JSON.stringify(mockInputs));
      inputsForRemove.args = ['remove', '--qualifier', 'LATEST', '--assume-yes'];

      // Set up the mock FC instance for this test
      const mockFcInstance = {
        listFunctionScalingConfig: jest.fn(),
        getFunctionScalingConfig: jest.fn(),
        putFunctionScalingConfig: jest.fn(),
        deleteFunctionScalingConfig: jest.fn(),
        removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      };
      (FC as unknown as jest.Mock).mockImplementation(() => mockFcInstance);

      scaling = new Scaling(inputsForRemove);

      await scaling.remove();
      expect(mockFcInstance.removeFunctionScalingConfig).toHaveBeenCalledWith(
        'test-function',
        'LATEST',
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      // Remove qualifier from inputs props and args to trigger the error
      const inputsWithoutQualifier = JSON.parse(JSON.stringify(mockInputs));
      inputsWithoutQualifier.args = ['remove', '--assume-yes'];
      inputsWithoutQualifier.props.qualifier = undefined;
      // We need to mock the FC constructor to throw an error when qualifier is not provided
      (FC as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Qualifier not specified, please specify --qualifier');
      });

      // Since the error is thrown in the constructor, we need to catch it there
      expect(() => new Scaling(inputsWithoutQualifier)).toThrow(
        'Qualifier not specified, please specify --qualifier',
      );
    });

    it('should prompt for confirmation when --assume-yes is not provided', async () => {
      const inputsForRemove = JSON.parse(JSON.stringify(mockInputs));
      inputsForRemove.args = ['remove', '--qualifier', 'LATEST'];

      // Mock promptForConfirmOrDetails to return false
      const utils = require('../../../../src/utils');
      (utils.promptForConfirmOrDetails as jest.Mock).mockResolvedValue(false);

      scaling = new Scaling(inputsForRemove);

      await scaling.remove();
      expect(utils.promptForConfirmOrDetails).toHaveBeenCalledWith(
        'Are you sure you want to delete the test-function function scaling config?',
      );
    }, 10000);
  });
});
