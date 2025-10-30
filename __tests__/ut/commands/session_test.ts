import Session from '../../../src/subCommands/session';
import FC from '../../../src/resources/fc';
import logger from '../../../src/logger';
import { IInputs } from '../../../src/interface';
import { promptForConfirmOrDetails } from '../../../src/utils';

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
  promptForConfirmOrDetails: jest.fn(),
}));

describe('Session', () => {
  let session: Session;
  let mockInputs: IInputs;
  let mockFcSdk: jest.Mocked<FC>;

  beforeEach(() => {
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
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
    (promptForConfirmOrDetails as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when subCommand is not provided', () => {
      mockInputs.args = [];
      expect(() => new Session(mockInputs)).toThrow(
        'Command "undefined" not found, Please use "s cli fc3 session -h" to query how to use the command',
      );
    });

    it('should throw error when subCommand is invalid', () => {
      mockInputs.args = ['invalid'];
      expect(() => new Session(mockInputs)).toThrow(
        'Command "invalid" not found, Please use "s cli fc3 session -h" to query how to use the command',
      );
    });

    it('should throw error when region is not specified', () => {
      delete mockInputs.props.region;
      mockInputs.args = ['list'];
      expect(() => new Session(mockInputs)).toThrow(
        'Region not specified, please specify --region',
      );
    });

    it('should create Session instance with valid inputs', () => {
      mockInputs.args = ['list'];
      session = new Session(mockInputs);
      expect(session).toBeInstanceOf(Session);
      expect(session.subCommand).toBe('list');
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockInputs.args = [
        'create',
        '--qualifier',
        'LATEST',
        '--session-ttl-in-seconds',
        '3600',
        '--session-idle-timeout-in-seconds',
        '1800',
      ];
      session = new Session(mockInputs);
    });

    it('should create session successfully', async () => {
      const mockResult = {
        sessionId: 'session-123',
        qualifier: 'LATEST',
        sessionTTLInSeconds: 3600,
        sessionIdleTimeoutInSeconds: 1800,
      };

      mockFcSdk.createFunctionSession = jest.fn().mockResolvedValue(mockResult);

      const result = await session.create();
      expect(result).toEqual(mockResult);
      expect(mockFcSdk.createFunctionSession).toHaveBeenCalledWith('test-function', {
        qualifier: 'LATEST',
        sessionTTLInSeconds: 3600,
        sessionIdleTimeoutInSeconds: 1800,
      });
    });

    it('should throw error when functionName is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['create'];
      session = new Session(mockInputs);

      await expect(session.create()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when sessionTTLInSeconds is invalid', async () => {
      mockInputs.args = ['create', '--session-ttl-in-seconds', '99999'];
      session = new Session(mockInputs);

      await expect(session.create()).rejects.toThrow(
        'timeout must be a number between 0 and 21600',
      );
    });

    it('should throw error when sessionIdleTimeoutInSeconds is invalid', async () => {
      mockInputs.args = ['create', '--session-idle-timeout-in-seconds', '99999'];
      session = new Session(mockInputs);

      await expect(session.create()).rejects.toThrow(
        'timeout must be a number between 0 and 21600',
      );
    });

    it('should create session with nasConfig when provided', async () => {
      const mockResult = {
        sessionId: 'session-123',
        qualifier: 'LATEST',
        sessionTTLInSeconds: 3600,
        sessionIdleTimeoutInSeconds: 1800,
      };

      mockFcSdk.createFunctionSession = jest.fn().mockResolvedValue(mockResult);
      mockInputs.args = [
        'create',
        '--qualifier',
        'LATEST',
        '--session-ttl-in-seconds',
        '3600',
        '--session-idle-timeout-in-seconds',
        '1800',
        '--nas-config',
        '{"userId":1000,"groupId":1000,"mountPoints":[{"serverAddr":"nas-server-addr","mountDir":"/mnt/nas","enableTLS":true}]}',
      ];
      session = new Session(mockInputs);

      const result = await session.create();
      expect(result).toEqual(mockResult);
      expect(mockFcSdk.createFunctionSession).toHaveBeenCalledWith('test-function', {
        qualifier: 'LATEST',
        sessionTTLInSeconds: 3600,
        sessionIdleTimeoutInSeconds: 1800,
        nasConfig: {
          userId: 1000,
          groupId: 1000,
          mountPoints: [
            {
              serverAddr: 'nas-server-addr',
              mountDir: '/mnt/nas',
              enableTLS: true,
            },
          ],
        },
      });
    });
  });

  describe('get', () => {
    beforeEach(() => {
      mockInputs.args = ['get', '--session-id', 'session-123', '--qualifier', 'LATEST'];
      session = new Session(mockInputs);
    });

    it('should get session successfully', async () => {
      const mockResult = {
        sessionId: 'session-123',
        qualifier: 'LATEST',
        status: 'Active',
      };

      mockFcSdk.getFunctionSession = jest.fn().mockResolvedValue(mockResult);

      const result = await session.get();
      expect(result).toEqual(mockResult);
      expect(mockFcSdk.getFunctionSession).toHaveBeenCalledWith(
        'test-function',
        'session-123',
        'LATEST',
      );
    });

    it('should throw error when functionName is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['get', '--session-id', 'session-123'];
      session = new Session(mockInputs);

      await expect(session.get()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when sessionId is not specified', async () => {
      mockInputs.args = ['get', '--qualifier', 'LATEST'];
      session = new Session(mockInputs);

      await expect(session.get()).rejects.toThrow(
        'sessionId not specified, please specify --session-id',
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      mockInputs.args = ['get', '--session-id', 'session-123'];
      session = new Session(mockInputs);

      await expect(session.get()).rejects.toThrow(
        'qualifier not specified, please specify --qualifier',
      );
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockInputs.args = [
        'update',
        '--session-id',
        'session-123',
        '--qualifier',
        'LATEST',
        '--session-ttl-in-seconds',
        '7200',
        '--session-idle-timeout-in-seconds',
        '3600',
      ];
      session = new Session(mockInputs);
    });

    it('should update session successfully', async () => {
      const mockResult = {
        sessionId: 'session-123',
        qualifier: 'LATEST',
        sessionTTLInSeconds: 7200,
        sessionIdleTimeoutInSeconds: 3600,
      };

      mockFcSdk.updateFunctionSession = jest.fn().mockResolvedValue(mockResult);

      const result = await session.update();
      expect(result).toEqual(mockResult);
      expect(mockFcSdk.updateFunctionSession).toHaveBeenCalledWith('test-function', 'session-123', {
        qualifier: 'LATEST',
        sessionTTLInSeconds: 7200,
        sessionIdleTimeoutInSeconds: 3600,
      });
    });

    it('should throw error when functionName is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['update', '--session-id', 'session-123'];
      session = new Session(mockInputs);

      await expect(session.update()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when sessionId is not specified', async () => {
      mockInputs.args = ['update', '--qualifier', 'LATEST'];
      session = new Session(mockInputs);

      await expect(session.update()).rejects.toThrow(
        'sessionId not specified, please specify --session-id',
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      mockInputs.args = ['update', '--session-id', 'session-123'];
      session = new Session(mockInputs);

      await expect(session.update()).rejects.toThrow(
        'qualifier not specified, please specify --qualifier',
      );
    });

    it('should throw error when sessionTTLInSeconds is invalid', async () => {
      mockInputs.args = [
        'update',
        '--session-id',
        'session-123',
        '--qualifier',
        'LATEST',
        '--session-ttl-in-seconds',
        '99999',
      ];
      session = new Session(mockInputs);

      await expect(session.update()).rejects.toThrow(
        'timeout must be a number between 0 and 21600',
      );
    });
  });

  describe('list', () => {
    beforeEach(() => {
      mockInputs.args = ['list'];
      session = new Session(mockInputs);
    });

    it('should list sessions successfully', async () => {
      const mockResult = {
        sessions: [
          {
            sessionId: 'session-123',
            qualifier: 'LATEST',
            status: 'Active',
          },
          {
            sessionId: 'session-456',
            qualifier: 'LATEST',
            status: 'Inactive',
          },
        ],
      };

      mockFcSdk.listFunctionSessions = jest.fn().mockResolvedValue(mockResult);

      const result = await session.list();
      expect(result).toEqual(mockResult.sessions);
      expect(mockFcSdk.listFunctionSessions).toHaveBeenCalledWith('test-function', { limit: 20 });
    });

    it('should list sessions with query parameters', async () => {
      mockInputs.args = [
        'list',
        '--limit',
        '10',
        '--qualifier',
        'LATEST',
        '--session-status',
        'Active',
      ];
      session = new Session(mockInputs);

      const mockResult = {
        sessions: [
          {
            sessionId: 'session-123',
            qualifier: 'LATEST',
            status: 'Active',
          },
        ],
      };

      mockFcSdk.listFunctionSessions = jest.fn().mockResolvedValue(mockResult);

      const result = await session.list();
      expect(result).toEqual(mockResult.sessions);
      expect(mockFcSdk.listFunctionSessions).toHaveBeenCalledWith('test-function', {
        limit: 10,
        qualifier: 'LATEST',
        sessionStatus: 'Active',
      });
    });

    it('should throw error when functionName is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['list'];
      session = new Session(mockInputs);

      await expect(session.list()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      mockInputs.args = ['remove', '--session-id', 'session-123', '--qualifier', 'LATEST', '-y'];
      session = new Session(mockInputs);
    });

    it('should remove session successfully', async () => {
      const mockResult = {};

      mockFcSdk.removeFunctionSession = jest.fn().mockResolvedValue(mockResult);

      const result = await session.remove();
      expect(result).toEqual(mockResult);
      expect(mockFcSdk.removeFunctionSession).toHaveBeenCalledWith(
        'test-function',
        'session-123',
        'LATEST',
      );
    });

    it('should prompt for confirmation when --assume-yes is not provided', async () => {
      mockInputs.args = ['remove', '--session-id', 'session-123', '--qualifier', 'LATEST'];
      session = new Session(mockInputs);

      const mockResult = {};
      mockFcSdk.removeFunctionSession = jest.fn().mockResolvedValue(mockResult);

      await session.remove();
      expect(promptForConfirmOrDetails).toHaveBeenCalledWith(
        `Are you sure you want to delete session session-123? Enter 'yes' to confirm:`,
      );
      expect(mockFcSdk.removeFunctionSession).toHaveBeenCalledWith(
        'test-function',
        'session-123',
        'LATEST',
      );
    });

    it('should skip removal when user declines confirmation', async () => {
      (promptForConfirmOrDetails as jest.Mock).mockResolvedValueOnce(false);
      mockInputs.args = ['remove', '--session-id', 'session-123', '--qualifier', 'LATEST'];
      session = new Session(mockInputs);

      await session.remove();
      expect(mockFcSdk.removeFunctionSession).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith('Skip remove session session-123');
    });

    it('should throw error when functionName is not specified', async () => {
      delete mockInputs.props.functionName;
      mockInputs.args = ['remove', '--session-id', 'session-123', '-y'];
      session = new Session(mockInputs);

      await expect(session.remove()).rejects.toThrow(
        'functionName not specified, please specify --function-name',
      );
    });

    it('should throw error when sessionId is not specified', async () => {
      mockInputs.args = ['remove', '--qualifier', 'LATEST', '-y'];
      session = new Session(mockInputs);

      await expect(session.remove()).rejects.toThrow(
        'sessionId not specified, please specify --session-id',
      );
    });

    it('should throw error when qualifier is not specified', async () => {
      mockInputs.args = ['remove', '--session-id', 'session-123', '-y'];
      session = new Session(mockInputs);

      await expect(session.remove()).rejects.toThrow(
        'qualifier not specified, please specify --qualifier',
      );
    });
  });
});
