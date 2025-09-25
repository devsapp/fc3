import Alias from '../../../src/subCommands/alias';
import FC from '../../../src/resources/fc';
import logger from '../../../src/logger';
import { IInputs } from '../../../src/interface';
import { promptForConfirmOrDetails, tableShow } from '../../../src/utils';

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

describe('Alias', () => {
  let mockInputs: IInputs;
  let alias: Alias;
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
      command: 'alias',
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
      listAlias: jest.fn().mockResolvedValue([{ aliasName: 'test-alias', versionId: '1' }]),
      getAlias: jest.fn().mockResolvedValue({ aliasName: 'test-alias', versionId: '1' }),
      publishAlias: jest.fn().mockResolvedValue({ aliasName: 'test-alias', versionId: '1' }),
      removeAlias: jest.fn().mockResolvedValue({}),
      getVersionLatest: jest.fn().mockResolvedValue({ versionId: '1' }),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);

    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
    (tableShow as jest.Mock).mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Alias instance with valid inputs for list command', () => {
      alias = new Alias(mockInputs);
      expect(alias).toBeInstanceOf(Alias);
      expect(alias.subCommand).toBe('list');
    });

    it('should create Alias instance with valid inputs for get command', () => {
      mockInputs.args = ['get', '--alias-name', 'test-alias'];
      alias = new Alias(mockInputs);
      expect(alias).toBeInstanceOf(Alias);
      expect(alias.subCommand).toBe('get');
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Alias(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 alias -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Alias(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 alias -h" to query how to use the command',
      );
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      mockInputs.args = ['list'];
      expect(() => new Alias(mockInputs)).toThrow('Region not specified');
    });

    it('should throw error when functionName is not specified', () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['list'];
      expect(() => new Alias(mockInputs)).toThrow(
        'Function name not specified, please specify --function-name',
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockInputs.args = ['list'];
      alias = new Alias(mockInputs);
    });

    it('should list aliases', async () => {
      const result = await alias.list();
      expect(result).toBeDefined();
      expect(mockFcInstance.listAlias).toHaveBeenCalledWith('test-function');
    });

    it('should show aliases in table format when table flag is provided', async () => {
      mockInputs.args = ['list', '--table'];
      alias = new Alias(mockInputs);
      await alias.list();
      expect(tableShow).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(() => {
      mockInputs.args = ['get', '--alias-name', 'test-alias'];
      alias = new Alias(mockInputs);
    });

    it('should get alias configuration', async () => {
      const result = await alias.get();
      expect(result).toBeDefined();
      expect(mockFcInstance.getAlias).toHaveBeenCalledWith('test-function', 'test-alias');
    });

    it('should throw error when aliasName is not specified', async () => {
      mockInputs.args = ['get'];
      alias = new Alias(mockInputs);
      await expect(alias.get()).rejects.toThrow(
        'Alias name not specified, please specify alias name',
      );
    });
  });

  describe('publish', () => {
    beforeEach(() => {
      mockInputs.args = ['publish', '--alias-name', 'test-alias', '--version-id', '1'];
      alias = new Alias(mockInputs);
    });

    it('should publish alias', async () => {
      const result = await alias.publish();
      expect(result).toBeDefined();
      expect(mockFcInstance.publishAlias).toHaveBeenCalledWith(
        'test-function',
        'test-alias',
        expect.objectContaining({
          aliasName: 'test-alias',
          versionId: '1',
        }),
      );
    });

    it('should throw error when aliasName is not specified', async () => {
      mockInputs.args = ['publish', '--version-id', '1'];
      alias = new Alias(mockInputs);
      await expect(alias.publish()).rejects.toThrow(
        'Alias name not specified, please specify --alias-name',
      );
    });

    it('should throw error when versionId is not specified', async () => {
      mockInputs.args = ['publish', '--alias-name', 'test-alias'];
      alias = new Alias(mockInputs);
      await expect(alias.publish()).rejects.toThrow(
        'Version ID not specified, please specify --version-id',
      );
    });

    it('should resolve latest version', async () => {
      mockInputs.args = ['publish', '--alias-name', 'test-alias', '--version-id', 'latest'];
      alias = new Alias(mockInputs);
      await alias.publish();
      expect(mockFcInstance.getVersionLatest).toHaveBeenCalledWith('test-function');
      expect(mockFcInstance.publishAlias).toHaveBeenCalledWith(
        'test-function',
        'test-alias',
        expect.objectContaining({
          versionId: '1',
        }),
      );
    });

    it('should throw error when latest version is not found', async () => {
      mockFcInstance.getVersionLatest.mockResolvedValueOnce({});
      mockInputs.args = ['publish', '--alias-name', 'test-alias', '--version-id', 'latest'];
      alias = new Alias(mockInputs);
      await expect(alias.publish()).rejects.toThrow('Not found versionId in the test-function');
    });

    it('should parse additionalVersionWeight JSON', async () => {
      mockInputs.args = [
        'publish',
        '--alias-name',
        'test-alias',
        '--version-id',
        '1',
        '--additionalVersionWeight',
        '{"2":0.2}',
      ];
      alias = new Alias(mockInputs);
      await alias.publish();
      expect(mockFcInstance.publishAlias).toHaveBeenCalledWith(
        'test-function',
        'test-alias',
        expect.objectContaining({
          additionalVersionWeight: { '2': 0.2 },
        }),
      );
    });

    it('should throw error when additionalVersionWeight is not valid JSON', async () => {
      mockInputs.args = [
        'publish',
        '--alias-name',
        'test-alias',
        '--version-id',
        '1',
        '--additionalVersionWeight',
        'invalid-json',
      ];
      alias = new Alias(mockInputs);
      await expect(alias.publish()).rejects.toThrow(
        'The incoming additionalVersionWeight is not a JSON. e.g.: The grayscale version is 1, accounting for 20%: \'{"1":0.2}\'',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockInputs.args = ['remove', '--alias-name', 'test-alias', '--assume-yes'];
      alias = new Alias(mockInputs);
    });

    it('should remove alias', async () => {
      await alias.remove();
      expect(mockFcInstance.removeAlias).toHaveBeenCalledWith('test-function', 'test-alias');
    });

    it('should throw error when aliasName is not specified', async () => {
      mockInputs.args = ['remove', '--assume-yes'];
      alias = new Alias(mockInputs);
      await expect(alias.remove()).rejects.toThrow(
        'Alias name not specified, please specify --alias-name',
      );
    });

    it('should prompt for confirmation when --assume-yes is not provided', async () => {
      mockInputs.args = ['remove', '--alias-name', 'test-alias'];
      alias = new Alias(mockInputs);
      await alias.remove();
      expect(promptForConfirmOrDetails).toHaveBeenCalledWith(
        'Are you sure you want to delete the test-function function test-alias alias?',
      );
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);
      mockInputs.args = ['remove', '--alias-name', 'test-alias'];
      alias = new Alias(mockInputs);
      await alias.remove();
      expect(mockFcInstance.removeAlias).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Skip remove test-function function test-alias alias?',
      );
    });
  });
});
