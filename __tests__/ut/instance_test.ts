import Instance from '../../src/subCommands/instance';
import FC from '../../src/resources/fc';
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

describe('Instance', () => {
  let mockInputs: IInputs;
  let instance: Instance;
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
      command: 'instance',
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
      listInstances: jest.fn().mockResolvedValue([
        {
          instanceId: 'i-12345',
          functionName: 'test-function',
          qualifier: 'LATEST',
          status: 'Running',
        },
      ]),
      instanceExec: jest.fn().mockResolvedValue({}),
    };

    // Mock FC constructor to return our mock instance
    (FC as any).mockImplementation(() => mockFcInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Instance instance with valid inputs for list command', () => {
      instance = new Instance(mockInputs);
      expect(instance).toBeInstanceOf(Instance);
      expect(instance.subCommand).toBe('list');
    });

    it('should create Instance instance with valid inputs for exec command', () => {
      mockInputs.args = ['exec'];
      instance = new Instance(mockInputs);
      expect(instance).toBeInstanceOf(Instance);
      expect(instance.subCommand).toBe('exec');
    });

    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Instance(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 instance -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Instance(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 instance -h" to query how to use the command',
      );
    });

    it('should handle region from command line args', () => {
      mockInputs.args = ['list'];
      mockInputs.props.region = undefined;
      mockInputs.args.push('--region', 'cn-beijing');
      instance = new Instance(mockInputs);
      expect(instance).toBeInstanceOf(Instance);
    });

    it('should throw error when region is not specified', () => {
      mockInputs.props.region = undefined;
      mockInputs.args = ['list'];
      expect(() => new Instance(mockInputs)).toThrow(
        'Region not specified, please specify --region',
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockInputs.args = ['list'];
      instance = new Instance(mockInputs);
    });

    it('should list instances successfully', async () => {
      const result = await instance.list();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        undefined,
        expect.objectContaining({
          userAgent: expect.stringContaining('command:instance'),
        }),
      );
      expect(mockFcInstance.listInstances).toHaveBeenCalledWith('test-function', 'LATEST');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          instanceId: 'i-12345',
          functionName: 'test-function',
          qualifier: 'LATEST',
          status: 'Running',
        }),
      );
    });

    it('should handle function name from command line args', async () => {
      mockInputs.args = ['list', '--function-name', 'cli-function'];
      instance = new Instance(mockInputs);

      await instance.list();

      expect(mockFcInstance.listInstances).toHaveBeenCalledWith('cli-function', 'LATEST');
    });

    it('should handle qualifier from command line args', async () => {
      mockInputs.args = ['list', '--qualifier', '1'];
      instance = new Instance(mockInputs);

      await instance.list();

      expect(mockFcInstance.listInstances).toHaveBeenCalledWith('test-function', '1');
    });

    it('should throw error when function name is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['list'];
      instance = new Instance(mockInputs);

      await expect(instance.list()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });
  });

  describe('exec', () => {
    beforeEach(() => {
      mockInputs.args = ['exec', '--instance-id', 'i-12345'];
      instance = new Instance(mockInputs);
    });

    it('should execute command in instance with default bash shell', async () => {
      await instance.exec();

      expect(FC).toHaveBeenCalledWith(
        'cn-hangzhou',
        undefined,
        expect.objectContaining({
          userAgent: expect.stringContaining('command:instance'),
        }),
      );
      expect(mockFcInstance.instanceExec).toHaveBeenCalledWith(
        'test-function',
        'i-12345',
        ['bash', '-c', '(cd /code ||  cd / ) && bash'],
        'LATEST',
        true,
      );
    });

    it('should execute command in instance with custom command', async () => {
      mockInputs.args = ['exec', '--instance-id', 'i-12345', '--cmd', 'ls -lh'];
      instance = new Instance(mockInputs);

      await instance.exec();

      expect(mockFcInstance.instanceExec).toHaveBeenCalledWith(
        'test-function',
        'i-12345',
        ['bash', '-c', 'ls -lh'],
        'LATEST',
        true,
      );
    });

    it('should handle function name from command line args', async () => {
      mockInputs.args = ['exec', '--instance-id', 'i-12345', '--function-name', 'cli-function'];
      instance = new Instance(mockInputs);

      await instance.exec();

      expect(mockFcInstance.instanceExec).toHaveBeenCalledWith(
        'cli-function',
        'i-12345',
        ['bash', '-c', '(cd /code ||  cd / ) && bash'],
        'LATEST',
        true,
      );
    });

    it('should handle qualifier from command line args', async () => {
      mockInputs.args = ['exec', '--instance-id', 'i-12345', '--qualifier', '1'];
      instance = new Instance(mockInputs);

      await instance.exec();

      expect(mockFcInstance.instanceExec).toHaveBeenCalledWith(
        'test-function',
        'i-12345',
        ['bash', '-c', '(cd /code ||  cd / ) && bash'],
        '1',
        true,
      );
    });

    it('should throw error when function name is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['exec', '--instance-id', 'i-12345'];
      instance = new Instance(mockInputs);

      await expect(instance.exec()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when instance id is not specified', async () => {
      mockInputs.args = ['exec'];
      instance = new Instance(mockInputs);

      await expect(instance.exec()).rejects.toThrow(
        'instanceId not specified, please specify --instance-id',
      );
    });
  });
});
