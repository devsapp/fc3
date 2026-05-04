import List from '../../../src/subCommands/list';
import FC from '../../../src/resources/fc';
import { IInputs } from '../../../src/interface';
import { tableShow } from '../../../src/utils';

// Mock dependencies
jest.mock('../../../src/resources/fc');
jest.mock('../../../src/logger', () => ({
  _set: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));
jest.mock('../../../src/utils', () => ({
  tableShow: jest.fn(),
  isAppCenter: jest.fn(),
  getUserAgent: jest.fn((userAgent, command) => {
    return (
      userAgent ||
      `Component:fc3;Nodejs:${process.version};OS:${process.platform}-${process.arch};command:${command}`
    );
  }),
}));

describe('List', () => {
  let list: List;
  let mockInputs: IInputs;
  let mockFcSdk: jest.Mocked<FC>;

  const mockFunctionsArray = [
    {
      functionName: 'test-func-1',
      runtime: 'nodejs18',
      handler: 'index.handler',
      memorySize: 128,
      state: 'Active',
      lastModifiedTime: '2024-01-01T00:00:00Z',
    },
    {
      functionName: 'test-func-2',
      runtime: 'python3.10',
      handler: 'main.handler',
      memorySize: 256,
      state: 'Active',
      lastModifiedTime: '2024-01-02T00:00:00Z',
    },
  ];

  const mockFunctionsPageBody = {
    functions: mockFunctionsArray,
    nextToken: 'next-token-123',
  };

  beforeEach(() => {
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
      },
      credential: {
        AccountID: 'test-account',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
      },
      args: [],
    } as any;

    mockFcSdk = new FC(mockInputs.props.region, mockInputs.credential, {}) as jest.Mocked<FC>;
    (FC as unknown as jest.Mock).mockImplementation(() => mockFcSdk);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create List instance with valid inputs', () => {
      mockInputs.args = [];
      list = new List(mockInputs);
      expect(list).toBeInstanceOf(List);
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      mockInputs.args = [];
      expect(() => new List(mockInputs)).toThrow('Region not specified, please specify --region');
    });

    it('should use region from command line args over props', () => {
      mockInputs.args = ['--region', 'cn-beijing'];
      list = new List(mockInputs);
      expect(list).toBeInstanceOf(List);
    });
  });

  describe('run - without limit (auto-pagination)', () => {
    beforeEach(() => {
      mockInputs.args = [];
      list = new List(mockInputs);
    });

    it('should list all functions via auto-pagination when no limit specified', async () => {
      mockFcSdk.listFunctions = jest.fn().mockResolvedValue(mockFunctionsArray);

      const result = await list.run();
      expect(mockFcSdk.listFunctions).toHaveBeenCalledWith(undefined);
      expect(mockFcSdk.listFunctionsPage).not.toHaveBeenCalled();
      expect(result).toEqual({ functions: mockFunctionsArray });
    });

    it('should list all functions with prefix filter via auto-pagination', async () => {
      mockInputs.args = ['--prefix', 'test'];
      list = new List(mockInputs);
      mockFcSdk.listFunctions = jest.fn().mockResolvedValue(mockFunctionsArray);

      const result = await list.run();
      expect(mockFcSdk.listFunctions).toHaveBeenCalledWith('test');
      expect(result).toEqual({ functions: mockFunctionsArray });
    });

    it('should show table output without limit', async () => {
      mockInputs.args = ['--table'];
      list = new List(mockInputs);
      mockFcSdk.listFunctions = jest.fn().mockResolvedValue(mockFunctionsArray);

      await list.run();
      expect(tableShow).toHaveBeenCalledWith(mockFunctionsArray, [
        'functionName',
        'runtime',
        'handler',
        'memorySize',
        'state',
        'lastModifiedTime',
      ]);
    });

    it('should handle empty functions list via auto-pagination', async () => {
      mockFcSdk.listFunctions = jest.fn().mockResolvedValue([]);

      const result = await list.run();
      expect(result).toEqual({ functions: [] });
    });

    it('should not call tableShow when --table is not specified', async () => {
      mockFcSdk.listFunctions = jest.fn().mockResolvedValue(mockFunctionsArray);

      await list.run();
      expect(tableShow).not.toHaveBeenCalled();
    });
  });

  describe('run - with limit (single page)', () => {
    it('should list functions with custom limit via single page', async () => {
      mockInputs.args = ['--limit', '20'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue(mockFunctionsPageBody);

      const result = await list.run();
      expect(mockFcSdk.listFunctionsPage).toHaveBeenCalledWith(20, undefined, undefined);
      expect(mockFcSdk.listFunctions).not.toHaveBeenCalled();
      expect(result).toEqual(mockFunctionsPageBody);
    });

    it('should reject --limit with value 0', async () => {
      mockInputs.args = ['--limit', '0'];
      list = new List(mockInputs);

      await expect(list.run()).rejects.toThrow('--limit must be a positive integer');
    });

    it('should reject --limit with non-integer value', async () => {
      mockInputs.args = ['--limit', 'abc'];
      list = new List(mockInputs);

      await expect(list.run()).rejects.toThrow('--limit must be a positive integer');
    });

    it('should list functions with prefix and limit', async () => {
      mockInputs.args = ['--prefix', 'test', '--limit', '20'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue(mockFunctionsPageBody);

      const result = await list.run();
      expect(mockFcSdk.listFunctionsPage).toHaveBeenCalledWith(20, 'test', undefined);
      expect(result).toEqual(mockFunctionsPageBody);
    });

    it('should list functions with nextToken for pagination', async () => {
      mockInputs.args = ['--limit', '20', '--next-token', 'next-token-123'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue(mockFunctionsPageBody);

      const result = await list.run();
      expect(mockFcSdk.listFunctionsPage).toHaveBeenCalledWith(20, undefined, 'next-token-123');
      expect(result).toEqual(mockFunctionsPageBody);
    });

    it('should list functions with all query parameters', async () => {
      mockInputs.args = ['--prefix', 'test', '--limit', '10', '--next-token', 'token-abc'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue(mockFunctionsPageBody);

      const result = await list.run();
      expect(mockFcSdk.listFunctionsPage).toHaveBeenCalledWith(10, 'test', 'token-abc');
      expect(result).toEqual(mockFunctionsPageBody);
    });

    it('should show table output with limit', async () => {
      mockInputs.args = ['--limit', '20', '--table'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue(mockFunctionsPageBody);

      await list.run();
      expect(tableShow).toHaveBeenCalledWith(mockFunctionsArray, [
        'functionName',
        'runtime',
        'handler',
        'memorySize',
        'state',
        'lastModifiedTime',
      ]);
    });

    it('should handle table output with empty functions via single page', async () => {
      mockInputs.args = ['--limit', '20', '--table'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockResolvedValue({
        functions: [],
      });

      await list.run();
      expect(tableShow).toHaveBeenCalledWith(
        [],
        ['functionName', 'runtime', 'handler', 'memorySize', 'state', 'lastModifiedTime'],
      );
    });
  });

  describe('run - error handling', () => {
    it('should propagate auto-pagination API errors', async () => {
      mockInputs.args = [];
      list = new List(mockInputs);
      mockFcSdk.listFunctions = jest.fn().mockRejectedValue(new Error('API error'));

      await expect(list.run()).rejects.toThrow('API error');
    });

    it('should propagate single page API errors', async () => {
      mockInputs.args = ['--limit', '20'];
      list = new List(mockInputs);
      mockFcSdk.listFunctionsPage = jest.fn().mockRejectedValue(new Error('API error'));

      await expect(list.run()).rejects.toThrow('API error');
    });
  });
});
