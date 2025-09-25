import Version from '../../../src/subCommands/version';
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

jest.mock('../../../src/utils', () => ({
  promptForConfirmOrDetails: jest.fn(),
}));

describe('Version', () => {
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
      command: 'version',
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
        SecurityToken: 'test-token',
      }),
    };

    // Mock FC methods
    mockFcInstance = {
      listFunctionVersion: jest.fn().mockResolvedValue([
        {
          versionId: '1',
          description: 'First version',
          createdTime: '2023-01-01T00:00:00Z',
        },
        {
          versionId: '2',
          description: 'Second version',
          createdTime: '2023-01-02T00:00:00Z',
        },
      ]),
      publishFunctionVersion: jest.fn().mockResolvedValue({
        versionId: '3',
        description: 'Published version',
        createdTime: '2023-01-03T00:00:00Z',
      }),
      removeFunctionVersion: jest.fn().mockResolvedValue({}),
      getVersionLatest: jest.fn().mockResolvedValue({
        versionId: '2',
      }),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation((...args: any[]) => {
      return mockFcInstance;
    });

    // Mock utils
    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Version instance with valid inputs for list command', () => {
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
      expect(version.subCommand).toBe('list');
    });

    it('should create Version instance with valid inputs for publish command', () => {
      mockInputs.args = ['publish'];
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
      expect(version.subCommand).toBe('publish');
    });

    it('should create Version instance with valid inputs for remove command', () => {
      mockInputs.args = ['remove'];
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
      expect(version.subCommand).toBe('remove');
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Version(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 version -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Version(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 version -h" to query how to use the command',
      );
    });

    it('should handle function name from command line args', () => {
      mockInputs.args = ['list'];
      mockInputs.props.functionName = undefined;
      mockInputs.args.push('--function-name', 'cli-function');
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
    });

    it('should throw error when function name is not specified', () => {
      mockInputs.props.functionName = undefined;
      mockInputs.args = ['list'];
      expect(() => new Version(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });

    it('should handle region from command line args', () => {
      mockInputs.props.region = undefined;
      mockInputs.args = ['list'];
      mockInputs.args.push('--region', 'cn-beijing');
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      mockInputs.args = ['list'];
      expect(() => new Version(mockInputs)).toThrow(
        'Region not specified, please specify --region',
      );
    });

    it('should handle description from command line args', () => {
      mockInputs.args = ['publish'];
      mockInputs.args.push('--description', 'Test description');
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
    });

    it('should handle version id from command line args', () => {
      mockInputs.args = ['remove'];
      mockInputs.args.push('--version-id', '1');
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
    });

    it('should handle assume-yes flag from command line args', () => {
      mockInputs.args = ['remove'];
      mockInputs.args.push('--version-id', '1', '--assume-yes');
      const version = new Version(mockInputs);
      expect(version).toBeInstanceOf(Version);
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockInputs.args = ['list'];
    });

    it('should list function versions successfully', async () => {
      const version = new Version(mockInputs);
      const result = await version.list();

      // Get the last call to FC constructor
      const lastCall = (FC as any).mock.calls[(FC as any).mock.calls.length - 1];
      expect(lastCall[0]).toBe('cn-hangzhou');
      expect(lastCall[2]).toEqual(
        expect.objectContaining({
          userAgent: expect.stringContaining('command:version'),
        }),
      );
      expect(mockFcInstance.listFunctionVersion).toHaveBeenCalledWith('test-function');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          versionId: '1',
          description: 'First version',
        }),
      );
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      mockInputs.args = ['publish'];
    });

    it('should publish function version successfully', async () => {
      const version = new Version(mockInputs);
      const result = await version.publish();

      expect(mockFcInstance.publishFunctionVersion).toHaveBeenCalledWith(
        'test-function',
        undefined,
      );
      expect(result).toEqual(
        expect.objectContaining({
          versionId: '3',
          description: 'Published version',
        }),
      );
    });

    it('should publish function version with description', async () => {
      mockInputs.args = ['publish', '--description', 'Test description'];
      const version = new Version(mockInputs);
      await version.publish();

      expect(mockFcInstance.publishFunctionVersion).toHaveBeenCalledWith(
        'test-function',
        'Test description',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockInputs.args = ['remove', '--version-id', '1'];
    });

    it('should remove function version successfully', async () => {
      const version = new Version(mockInputs);
      await version.remove();

      expect(mockFcInstance.removeFunctionVersion).toHaveBeenCalledWith('test-function', '1');
    });

    it('should throw error when version id is not specified', async () => {
      mockInputs.args = ['remove'];
      const version = new Version(mockInputs);
      await expect(version.remove()).rejects.toThrow('Need specify remove the versionId');
    });

    it('should resolve latest version and remove it', async () => {
      mockInputs.args = ['remove', '--version-id', 'LATEST'];
      const version = new Version(mockInputs);
      await version.remove();

      expect(mockFcInstance.getVersionLatest).toHaveBeenCalledWith('test-function');
      expect(mockFcInstance.removeFunctionVersion).toHaveBeenCalledWith('test-function', '2');
    });

    it('should throw error when latest version is not found', async () => {
      mockFcInstance.getVersionLatest.mockResolvedValueOnce({});
      mockInputs.args = ['remove', '--version-id', 'LATEST'];
      const version = new Version(mockInputs);
      await expect(version.remove()).rejects.toThrow('Not found versionId in the test-function');
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);
      const version = new Version(mockInputs);
      await version.remove();

      expect(mockFcInstance.removeFunctionVersion).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Skip remove test-function function 1 version');
    });

    it('should remove directly when assume-yes flag is set', async () => {
      mockInputs.args = ['remove', '--version-id', '1', '--assume-yes'];
      const version = new Version(mockInputs);
      await version.remove();

      expect(promptForConfirmOrDetails).not.toHaveBeenCalled();
      expect(mockFcInstance.removeFunctionVersion).toHaveBeenCalledWith('test-function', '1');
    });
  });
});
