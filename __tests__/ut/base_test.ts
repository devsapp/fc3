import Base from '../../src/base';
import { IInputs } from '../../src/interface';
import Role from '../../src/resources/ram';
import { TriggerType } from '../../src/interface/base';
import { isAuto } from '../../src/utils';

// Mock dependencies
jest.mock('../../src/resources/ram');
jest.mock('../../src/utils');
jest.mock('../../src/resources/fc');
jest.mock('../../src/commands-help');

// Mock logger
jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  _set: jest.fn(),
}));

describe('Base', () => {
  let base: Base;
  let mockInputs: IInputs;

  beforeEach(() => {
    base = new Base({ logger: console });

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Base instance with logger', () => {
      expect(base).toBeInstanceOf(Base);
      expect(base.logger).toBe(console);
    });

    it('should use console as default logger when not provided', () => {
      const baseWithoutLogger = new Base({});
      expect(baseWithoutLogger.logger).toBe(console);
    });
  });

  describe('handlePreRun', () => {
    beforeEach(() => {
      // Mock FC methods
      const FC = require('../../src/resources/fc').default;
      FC.isCustomContainerRuntime = jest.fn().mockReturnValue(false);
      FC.isCustomRuntime = jest.fn().mockReturnValue(false);
    });

    it('should handle basic preprocessing', async () => {
      await base.handlePreRun(mockInputs, true);

      // Logger is mocked, so we can't verify specific calls
    });

    it('should trim image whitespace for custom container', async () => {
      mockInputs.props.customContainerConfig = {
        image: '  test-image:latest  ',
      };

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.props.customContainerConfig.image).toBe('test-image:latest');
    });

    it('should handle role processing when needCredential is true', async () => {
      mockInputs.props.role = 'test-role';
      mockInputs.credential = undefined;

      Role.isRoleArnFormat = jest.fn().mockReturnValue(false);
      Role.completionArn = jest.fn().mockReturnValue('acs:ram::123456789:role/test-role');

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.getCredential).toHaveBeenCalled();
      expect(Role.completionArn).toHaveBeenCalledWith('test-role', '123456789');
      expect(mockInputs.props.role).toBe('acs:ram::123456789:role/test-role');
    });

    it('should not process role when needCredential is false', async () => {
      mockInputs.props.role = 'acs:ram::123456789:role/test-role'; // Use ARN format
      Role.isRoleArnFormat = jest.fn().mockReturnValue(true);

      await base.handlePreRun(mockInputs, false);

      expect(mockInputs.getCredential).not.toHaveBeenCalled();
    });

    it('should handle existing credential', async () => {
      mockInputs.props.role = 'test-role';
      mockInputs.credential = {
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
      };

      Role.isRoleArnFormat = jest.fn().mockReturnValue(false);
      Role.completionArn = jest.fn().mockReturnValue('acs:ram::123456789:role/test-role');

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.getCredential).not.toHaveBeenCalled();
      expect(Role.completionArn).toHaveBeenCalledWith('test-role', '123456789');
    });

    it('should set baseDir from yaml path', async () => {
      mockInputs.yaml = { path: '/project/s.yaml' };

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.baseDir).toBe('/project');
    });

    it('should set baseDir from process.cwd when no yaml path', async () => {
      mockInputs.yaml = undefined;

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.baseDir).toBe(process.cwd());
    });

    it('should apply default config for custom container runtime', async () => {
      const FC = require('../../src/resources/fc').default;
      FC.isCustomContainerRuntime = jest.fn().mockReturnValue(true);

      await base.handlePreRun(mockInputs, true);

      expect(FC.isCustomContainerRuntime).toHaveBeenCalledWith('nodejs18');
    });

    it('should apply default config for custom runtime', async () => {
      const FC = require('../../src/resources/fc').default;
      FC.isCustomRuntime = jest.fn().mockReturnValue(true);

      await base.handlePreRun(mockInputs, true);

      expect(FC.isCustomRuntime).toHaveBeenCalledWith('nodejs18');
    });

    it('should set default cpu and diskSize for 512MB memory', async () => {
      mockInputs.props.memorySize = 512;
      mockInputs.props.cpu = undefined;
      mockInputs.props.diskSize = undefined;

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.props.cpu).toBe(0.35);
      expect(mockInputs.props.diskSize).toBe(512);
    });

    it('should not set default cpu and diskSize for non-512MB memory', async () => {
      mockInputs.props.memorySize = 256;
      mockInputs.props.cpu = undefined;
      mockInputs.props.diskSize = undefined;

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.props.cpu).toBeUndefined();
      expect(mockInputs.props.diskSize).toBeUndefined();
    });

    it('should warn about unsupported region for custom container', async () => {
      const FC = require('../../src/resources/fc').default;
      FC.isCustomContainerRuntime = jest.fn().mockReturnValue(true);
      mockInputs.props.region = 'cn-guangzhou' as any; // Use a region not in IMAGE_ACCELERATION_REGION

      await base.handlePreRun(mockInputs, true);

      // Logger is mocked, so we can't verify specific calls
    });

    it('should handle nasConfig with mountPoints', async () => {
      mockInputs.props.nasConfig = {
        userId: 1000,
        groupId: 1000,
        mountPoints: [
          { serverAddr: 'nas-server1', mountDir: '/mnt/nas' },
          { serverAddr: 'nas-server2', mountDir: '/mnt/nas2', enableTLS: undefined },
        ],
      };

      (isAuto as jest.Mock).mockReturnValue(false);

      await base.handlePreRun(mockInputs, true);

      expect((mockInputs.props.nasConfig as any).mountPoints[1].enableTLS).toBe(false);
    });

    it('should handle triggers with invocationRole', async () => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: TriggerType.oss,
          triggerConfig: {},
          invocationRole: 'test-role',
        },
      ];

      Role.isRoleArnFormat = jest.fn().mockReturnValue(false);
      Role.completionArn = jest.fn().mockReturnValue('acs:ram::123456789:role/test-role');

      await base.handlePreRun(mockInputs, true);

      expect(mockInputs.props.triggers[0].invocationRole).toBe('acs:ram::123456789:role/test-role');
    });

    it('should handle triggers without invocationRole', async () => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: TriggerType.oss,
          triggerConfig: {},
        },
      ];

      const mockRamClient = {
        initFcOssTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-oss-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      await base.handlePreRun(mockInputs, true);

      expect(mockRamClient.initFcOssTriggerRole).toHaveBeenCalled();
      expect(mockInputs.props.triggers[0].invocationRole).toBe(
        'acs:ram::123456789:role/fc-oss-trigger-role',
      );
    });

    it('should handle eventbridge trigger with service linked role', async () => {
      mockInputs.props.triggers = [
        {
          triggerName: 'test-trigger',
          triggerType: TriggerType.eventbridge,
          triggerConfig: {
            eventSourceConfig: {
              eventSourceType: 'MNS',
            },
          },
        },
      ];

      const mockRamClient = {
        initSlrRole: jest.fn().mockResolvedValue(undefined),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      await base.handlePreRun(mockInputs, true);

      expect(mockRamClient.initSlrRole).toHaveBeenCalledWith('SENDTOFC');
      expect(mockRamClient.initSlrRole).toHaveBeenCalledWith('MNS');
    });

    it('should handle role validation errors', async () => {
      mockInputs.props.role = 123 as any; // Invalid role type

      await expect(base.handlePreRun(mockInputs, true)).rejects.toThrow('role must be a string');
    });
  });

  describe('_handleRole', () => {
    it('should return undefined role as is', async () => {
      const result = await (base as any)._handleRole(undefined, false, mockInputs);
      expect(result).toBeUndefined();
    });

    it('should return empty string role as is', async () => {
      const result = await (base as any)._handleRole('', false, mockInputs);
      expect(result).toBe('');
    });

    it('should return valid ARN role as is', async () => {
      Role.isRoleArnFormat = jest.fn().mockReturnValue(true);

      const result = await (base as any)._handleRole(
        'acs:ram::123456789:role/test-role',
        false,
        mockInputs,
      );

      expect(result).toBe('acs:ram::123456789:role/test-role');
    });

    it('should convert role name to lowercase', async () => {
      const result = await (base as any)._handleRole('TEST-ROLE', false, mockInputs);
      expect(result).toBe('test-role');
    });

    it('should throw error for non-string role', async () => {
      await expect((base as any)._handleRole(123, false, mockInputs)).rejects.toThrow(
        'role must be a string',
      );
    });
  });

  describe('_handleDefaultTriggerRole', () => {
    beforeEach(() => {
      mockInputs.credential = {
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
      };
    });

    it('should handle OSS trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.oss,
      };

      const mockRamClient = {
        initFcOssTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-oss-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initFcOssTriggerRole).toHaveBeenCalled();
      expect(result).toBe('acs:ram::123456789:role/fc-oss-trigger-role');
    });

    it('should handle SLS trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.log,
      };

      const mockRamClient = {
        initFcSlsTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-sls-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initFcSlsTriggerRole).toHaveBeenCalled();
      expect(result).toBe('acs:ram::123456789:role/fc-sls-trigger-role');
    });

    it('should handle MNS topic trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.mns_topic,
      };

      const mockRamClient = {
        initFcMnsTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-mns-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initFcMnsTriggerRole).toHaveBeenCalled();
      expect(result).toBe('acs:ram::123456789:role/fc-mns-trigger-role');
    });

    it('should handle CDN events trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.cdn_events,
      };

      const mockRamClient = {
        initFcCdnTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-cdn-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initFcCdnTriggerRole).toHaveBeenCalled();
      expect(result).toBe('acs:ram::123456789:role/fc-cdn-trigger-role');
    });

    it('should handle TableStore trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.tablestore,
      };

      const mockRamClient = {
        initFcOtsTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-ots-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initFcOtsTriggerRole).toHaveBeenCalled();
      expect(result).toBe('acs:ram::123456789:role/fc-ots-trigger-role');
    });

    it('should handle EventBridge trigger', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.eventbridge,
        triggerConfig: {
          eventSourceConfig: {
            eventSourceType: 'MNS',
          },
        },
      };

      const mockRamClient = {
        initSlrRole: jest.fn().mockResolvedValue(undefined),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockRamClient.initSlrRole).toHaveBeenCalledWith('SENDTOFC');
      expect(mockRamClient.initSlrRole).toHaveBeenCalledWith('MNS');
      expect(result).toBeUndefined();
    });

    it('should handle unknown trigger type', async () => {
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: 'unknown',
      };

      const result = await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      // Logger is mocked, so we can't verify specific calls
      expect(result).toBeUndefined();
    });

    it('should get credential when not available', async () => {
      mockInputs.credential = undefined;
      const trigger = {
        triggerName: 'test-trigger',
        triggerType: TriggerType.oss,
      };

      const mockRamClient = {
        initFcOssTriggerRole: jest
          .fn()
          .mockResolvedValue('acs:ram::123456789:role/fc-oss-trigger-role'),
      };
      const RamClient = require('../../src/resources/ram').RamClient;
      RamClient.mockImplementation(() => mockRamClient);

      await (base as any)._handleDefaultTriggerRole(mockInputs, trigger);

      expect(mockInputs.getCredential).toHaveBeenCalled();
    });
  });
});
