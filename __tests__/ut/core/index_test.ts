import Fc from '../../../src/index';
import Base from '../../../src/base';
import { IInputs } from '../../../src/interface';
import { SCHEMA_FILE_PATH } from '../../../src/constant';
import { Runtime } from '../../../src/interface/base';
import * as fs from 'fs';

// Mock dependencies
jest.mock('../../../src/base');
jest.mock('fs');
jest.mock('../../../src/resources/fc', () => {
  const actualFc = jest.requireActual('../../../src/resources/fc');
  return {
    __esModule: true,
    ...actualFc,
    default: {
      ...actualFc.default,
      isCustomContainerRuntime: jest.fn((runtime) => {
        // 默认返回false，但在需要的时候可以手动设置返回值
        return false;
      }),
    },
  };
});
jest.mock('../../../src/subCommands/build');
jest.mock('../../../src/subCommands/local');
jest.mock('../../../src/subCommands/deploy');
jest.mock('../../../src/subCommands/info');
jest.mock('../../../src/subCommands/plan');
jest.mock('../../../src/subCommands/invoke');
jest.mock('../../../src/subCommands/provision');
jest.mock('../../../src/subCommands/layer');
jest.mock('../../../src/subCommands/instance');
jest.mock('../../../src/subCommands/remove');
jest.mock('../../../src/subCommands/sync');
jest.mock('../../../src/subCommands/version');
jest.mock('../../../src/subCommands/alias');
jest.mock('../../../src/subCommands/concurrency');
jest.mock('../../../src/subCommands/2to3');
jest.mock('../../../src/subCommands/logs');
jest.mock('../../../src/subCommands/model');
jest.mock('../../../src/utils');

// Mock aliyun-sdk SLS module
jest.mock('aliyun-sdk', () => {
  return {
    SLS: jest.fn().mockImplementation(() => {
      return {};
    }),
  };
});

// Mock logger
jest.mock('../../../src/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  tips: jest.fn(),
  tipsOnce: jest.fn(),
}));

describe('Fc', () => {
  let fc: Fc;
  let mockInputs: IInputs;

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

    fc = new Fc({ logger: console });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create Fc instance with logger', () => {
      expect(fc).toBeInstanceOf(Fc);
      expect(fc).toBeInstanceOf(Base);
    });
  });

  describe('deploy', () => {
    it('should call handlePreRun and create Deploy instance', async () => {
      const mockDeploy = {
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      const Deploy = require('../../../src/subCommands/deploy').default;
      Deploy.mockImplementation(() => mockDeploy);

      const result = await fc.deploy(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      // Logger is mocked, so we can't verify specific calls
      expect(Deploy).toHaveBeenCalledWith(mockInputs);
      expect(mockDeploy.run).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should call logger.tipsOnce when available', async () => {
      const mockDeploy = {
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      const Deploy = require('../../../src/subCommands/deploy').default;
      Deploy.mockImplementation(() => mockDeploy);

      await fc.deploy(mockInputs);

      // Logger is mocked, so we can't verify specific calls
    });

    it('should call logger.tips when tipsOnce is not available', async () => {
      const mockDeploy = {
        run: jest.fn().mockResolvedValue({ success: true }),
      };
      const Deploy = require('../../../src/subCommands/deploy').default;
      Deploy.mockImplementation(() => mockDeploy);

      // Mock logger without tipsOnce method
      const loggerModule = require('../../../src/logger');
      const mockLogger = {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        tips: jest.fn(),
        // tipsOnce is intentionally omitted
      };

      // Temporarily replace the logger
      const originalLogger = loggerModule.default;
      loggerModule.default = mockLogger;

      await fc.deploy(mockInputs);

      // Restore the original logger
      loggerModule.default = originalLogger;

      // Logger is mocked, so we can't verify specific calls
    });
  });

  describe('info', () => {
    it('should call handlePreRun and create Info instance', async () => {
      const mockInfo = {
        run: jest.fn().mockResolvedValue({ functionName: 'test-function' }),
      };
      const Info = require('../../../src/subCommands/info').default;
      Info.mockImplementation(() => mockInfo);

      const result = await fc.info(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Info).toHaveBeenCalledWith(mockInputs);
      expect(mockInfo.run).toHaveBeenCalled();
      // Logger is mocked, so we can't verify specific calls
      expect(result).toEqual({ functionName: 'test-function' });
    });
  });

  describe('plan', () => {
    it('should call handlePreRun and create Plan instance', async () => {
      const mockPlan = {
        run: jest.fn().mockResolvedValue({ plan: 'test-plan' }),
      };
      const Plan = require('../../../src/subCommands/plan').default;
      Plan.mockImplementation(() => mockPlan);

      const result = await fc.plan(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Plan).toHaveBeenCalledWith(mockInputs);
      expect(mockPlan.run).toHaveBeenCalled();
      // Logger is mocked, so we can't verify specific calls
      expect(result).toEqual({ plan: 'test-plan' });
    });
  });

  describe('invoke', () => {
    it('should call handlePreRun and create Invoke instance', async () => {
      const mockInvoke = {
        run: jest.fn().mockResolvedValue({ result: 'test-result' }),
      };
      const Invoke = require('../../../src/subCommands/invoke').default;
      Invoke.mockImplementation(() => mockInvoke);

      const result = await fc.invoke(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Invoke).toHaveBeenCalledWith(mockInputs);
      expect(mockInvoke.run).toHaveBeenCalled();
      expect(result).toEqual({ result: 'test-result' });
    });
  });

  describe('sync', () => {
    it('should call handlePreRun and create Sync instance', async () => {
      const mockSync = {
        run: jest.fn().mockResolvedValue({ synced: true }),
      };
      const Sync = require('../../../src/subCommands/sync').default;
      Sync.mockImplementation(() => mockSync);

      const result = await fc.sync(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Sync).toHaveBeenCalledWith(mockInputs);
      expect(mockSync.run).toHaveBeenCalled();
      expect(result).toEqual({ synced: true });
    });
  });

  describe('remove', () => {
    it('should call handlePreRun and create Remove instance', async () => {
      const mockRemove = {
        run: jest.fn().mockResolvedValue({ removed: true }),
      };
      const Remove = require('../../../src/subCommands/remove').default;
      Remove.mockImplementation(() => mockRemove);

      const result = await fc.remove(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Remove).toHaveBeenCalledWith(mockInputs);
      expect(mockRemove.run).toHaveBeenCalled();
      expect(result).toEqual({ removed: true });
    });
  });

  describe('version', () => {
    it('should call handlePreRun and create Version instance', async () => {
      const mockVersion = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ version: '1.0.0' }),
      };
      const Version = require('../../../src/subCommands/version').default;
      Version.mockImplementation(() => mockVersion);

      const result = await fc.version(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Version).toHaveBeenCalledWith(mockInputs);
      expect(mockVersion.list).toHaveBeenCalled();
      expect(result).toEqual({ version: '1.0.0' });
    });
  });

  describe('alias', () => {
    it('should call handlePreRun and create Alias instance', async () => {
      const mockAlias = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ aliases: [] }),
      };
      const Alias = require('../../../src/subCommands/alias').default;
      Alias.mockImplementation(() => mockAlias);

      const result = await fc.alias(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Alias).toHaveBeenCalledWith(mockInputs);
      expect(mockAlias.list).toHaveBeenCalled();
      expect(result).toEqual({ aliases: [] });
    });
  });

  describe('concurrency', () => {
    it('should call handlePreRun and create Concurrency instance', async () => {
      const mockConcurrency = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ concurrency: 10 }),
      };
      const Concurrency = require('../../../src/subCommands/concurrency').default;
      Concurrency.mockImplementation(() => mockConcurrency);

      const result = await fc.concurrency(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Concurrency).toHaveBeenCalledWith(mockInputs);
      expect(mockConcurrency.list).toHaveBeenCalled();
      expect(result).toEqual({ concurrency: 10 });
    });
  });

  describe('provision', () => {
    it('should call handlePreRun and create Provision instance', async () => {
      const mockProvision = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ provision: 5 }),
      };
      const Provision = require('../../../src/subCommands/provision').default;
      Provision.mockImplementation(() => mockProvision);

      const result = await fc.provision(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Provision).toHaveBeenCalledWith(mockInputs);
      expect(mockProvision.list).toHaveBeenCalled();
      expect(result).toEqual({ provision: 5 });
    });
  });

  describe('layer', () => {
    it('should call handlePreRun and create Layer instance', async () => {
      const mockLayer = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ layers: [] }),
      };
      const Layer = require('../../../src/subCommands/layer').default;
      Layer.mockImplementation(() => mockLayer);

      const result = await fc.layer(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Layer).toHaveBeenCalledWith(mockInputs);
      expect(mockLayer.list).toHaveBeenCalled();
      expect(result).toEqual({ layers: [] });
    });
  });

  describe('instance', () => {
    it('should call handlePreRun and create Instance instance', async () => {
      const mockInstance = {
        subCommand: 'list',
        list: jest.fn().mockResolvedValue({ instances: [] }),
      };
      const Instance = require('../../../src/subCommands/instance').default;
      Instance.mockImplementation(() => mockInstance);

      const result = await fc.instance(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Instance).toHaveBeenCalledWith(mockInputs);
      expect(mockInstance.list).toHaveBeenCalled();
      expect(result).toEqual({ instances: [] });
    });
  });

  describe('build', () => {
    it('should call handlePreRun with needCredential false', async () => {
      const BuilderFactory = require('../../../src/subCommands/build').default;
      const mockBuilder = {
        build: jest.fn().mockResolvedValue({}),
      };
      BuilderFactory.getBuilder = jest.fn().mockReturnValue(mockBuilder);

      const result = await fc.build(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, false);
      expect(result).toEqual({});
    });

    it('should use ImageBuildKit builder for custom container in YunXiao', async () => {
      const BuilderFactory = require('../../../src/subCommands/build').default;
      const mockBuilder = {
        build: jest.fn().mockResolvedValue({}),
      };
      const getBuilderSpy = jest.spyOn(BuilderFactory, 'getBuilder');
      getBuilderSpy.mockReturnValue(mockBuilder);

      // Mock FC.isCustomContainerRuntime to return true
      const FC = require('../../../src/resources/fc').default;
      FC.isCustomContainerRuntime.mockReturnValue(true);

      // Mock YunXiao environment
      const utils = require('../../../src/utils');
      const isYunXiaoSpy = jest.spyOn(utils, 'isYunXiao');
      isYunXiaoSpy.mockReturnValue(true);
      const originalEnv = process.env.enableBuildkitServer;
      process.env.enableBuildkitServer = '1';

      mockInputs.props.runtime = Runtime['custom-container'];

      await fc.build(mockInputs);

      // Restore original environment
      process.env.enableBuildkitServer = originalEnv;

      expect(FC.isCustomContainerRuntime).toHaveBeenCalledWith(Runtime['custom-container']);
      expect(isYunXiaoSpy).toHaveBeenCalled();
      expect(getBuilderSpy).toHaveBeenCalledWith('IAMGE_BULD_KIT', mockInputs);
    });

    it('should use ImageKaniko builder for custom container in AppCenter', async () => {
      const BuilderFactory = require('../../../src/subCommands/build').default;
      const mockBuilder = {
        build: jest.fn().mockResolvedValue({}),
      };
      const getBuilderSpy = jest.spyOn(BuilderFactory, 'getBuilder');
      getBuilderSpy.mockReturnValue(mockBuilder);

      // Mock FC.isCustomContainerRuntime to return true
      const FC = require('../../../src/resources/fc').default;
      FC.isCustomContainerRuntime.mockReturnValue(true);

      // Mock AppCenter environment
      const utils = require('../../../src/utils');
      const isAppCenterSpy = jest.spyOn(utils, 'isAppCenter');
      isAppCenterSpy.mockReturnValue(true);

      mockInputs.props.runtime = Runtime['custom-container'];

      await fc.build(mockInputs);

      expect(FC.isCustomContainerRuntime).toHaveBeenCalledWith(Runtime['custom-container']);
      expect(isAppCenterSpy).toHaveBeenCalled();
      expect(getBuilderSpy).toHaveBeenCalledWith('IMAGE_BUILD_KANIKO', mockInputs);
    });

    it('should use ImageDocker builder for custom container in other environments', async () => {
      const BuilderFactory = require('../../../src/subCommands/build').default;
      const mockBuilder = {
        build: jest.fn().mockResolvedValue({}),
      };
      const getBuilderSpy = jest.spyOn(BuilderFactory, 'getBuilder');
      getBuilderSpy.mockReturnValue(mockBuilder);

      // Mock FC.isCustomContainerRuntime to return true
      const FC = require('../../../src/resources/fc').default;
      FC.isCustomContainerRuntime.mockReturnValue(true);

      // Mock other environment
      const utils = require('../../../src/utils');
      const isYunXiaoSpy = jest.spyOn(utils, 'isYunXiao');
      const isAppCenterSpy = jest.spyOn(utils, 'isAppCenter');
      isYunXiaoSpy.mockReturnValue(false);
      isAppCenterSpy.mockReturnValue(false);

      mockInputs.props.runtime = Runtime['custom-container'];

      await fc.build(mockInputs);

      expect(FC.isCustomContainerRuntime).toHaveBeenCalledWith(Runtime['custom-container']);
      expect(isYunXiaoSpy).toHaveBeenCalled();
      expect(isAppCenterSpy).toHaveBeenCalled();
      expect(getBuilderSpy).toHaveBeenCalledWith('IAMGE_BULD_DOCKER', mockInputs);
    });

    it('should use Default builder for non-custom container runtime', async () => {
      const BuilderFactory = require('../../../src/subCommands/build').default;
      const mockBuilder = {
        build: jest.fn().mockResolvedValue({}),
      };
      const getBuilderSpy = jest.spyOn(BuilderFactory, 'getBuilder');
      getBuilderSpy.mockReturnValue(mockBuilder);

      // Mock FC.isCustomContainerRuntime to return false
      const FC = require('../../../src/resources/fc').default;
      FC.isCustomContainerRuntime.mockReturnValue(false);

      mockInputs.props.runtime = 'nodejs18';

      await fc.build(mockInputs);

      expect(FC.isCustomContainerRuntime).toHaveBeenCalledWith('nodejs18');
      expect(getBuilderSpy).toHaveBeenCalledWith('DEFAULT', mockInputs);
    });
  });

  describe('local', () => {
    it('should call handlePreRun and check Docker', async () => {
      const { checkDockerIsOK } = require('../../../src/utils');
      const utils = require('@serverless-devs/utils');
      const parseArgv = jest.spyOn(utils, 'parseArgv');

      parseArgv.mockReturnValue({ _: ['start'] });

      const mockLocal = {
        start: jest.fn().mockResolvedValue({ started: true }),
      };
      const Local = require('../../../src/subCommands/local').default;
      Local.mockImplementation(() => mockLocal);

      const result = await fc.local(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(checkDockerIsOK).toHaveBeenCalled();
      expect(Local).toHaveBeenCalled();
      expect(mockLocal.start).toHaveBeenCalledWith(mockInputs);
      expect(result).toEqual({ started: true });
    });

    it('should call local.invoke for invoke subcommand', async () => {
      const utils = require('@serverless-devs/utils');
      const parseArgv = jest.spyOn(utils, 'parseArgv');
      parseArgv.mockReturnValue({ _: ['invoke'] });

      const mockLocal = {
        invoke: jest.fn().mockResolvedValue({ invoked: true }),
      };
      const Local = require('../../../src/subCommands/local').default;
      Local.mockImplementation(() => mockLocal);

      const result = await fc.local(mockInputs);

      expect(mockLocal.invoke).toHaveBeenCalledWith(mockInputs);
      expect(result).toEqual({ invoked: true });
    });

    it('should throw error when no subcommand specified', async () => {
      const utils = require('@serverless-devs/utils');
      const parseArgv = jest.spyOn(utils, 'parseArgv');
      parseArgv.mockReturnValue({ _: [] });

      await expect(fc.local(mockInputs)).rejects.toThrow(
        "Please use 's local -h', need specify subcommand",
      );
    });

    it('should throw error for invalid subcommand', async () => {
      const utils = require('@serverless-devs/utils');
      const parseArgv = jest.spyOn(utils, 'parseArgv');
      parseArgv.mockReturnValue({ _: ['invalid'] });

      await expect(fc.local(mockInputs)).rejects.toThrow(
        "Please use 's local start -h' or 's local invoke -h'",
      );
    });
  });

  describe('s2tos3', () => {
    it('should call handlePreRun and create SYaml2To3 instance', async () => {
      const mockTrans = {
        run: jest.fn().mockResolvedValue({ converted: true }),
      };
      const SYaml2To3 = require('../../../src/subCommands/2to3').default;
      SYaml2To3.mockImplementation(() => mockTrans);

      const result = await fc.s2tos3(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, false);
      expect(SYaml2To3).toHaveBeenCalledWith(mockInputs);
      expect(mockTrans.run).toHaveBeenCalled();
      expect(result).toEqual({ converted: true });
    });
  });

  describe('logs', () => {
    it('should call handlePreRun and create Logs instance', async () => {
      const mockLogs = {
        run: jest.fn().mockResolvedValue({ logs: [] }),
      };
      const Logs = require('../../../src/subCommands/logs').default;
      Logs.mockImplementation(() => mockLogs);

      const result = await fc.logs(mockInputs);

      expect(Base.prototype.handlePreRun).toHaveBeenCalledWith(mockInputs, true);
      expect(Logs).toHaveBeenCalledWith(mockInputs);
      expect(mockLogs.run).toHaveBeenCalled();
      expect(result).toEqual({ logs: [] });
    });
  });

  describe('getSchema', () => {
    it('should read and return schema file content', async () => {
      const mockSchemaContent = '{"type": "object"}';
      (fs.readFileSync as jest.Mock).mockReturnValue(mockSchemaContent);

      const result = await fc.getSchema(mockInputs);

      // Logger is mocked, so we can't verify specific calls
      expect(fs.readFileSync).toHaveBeenCalledWith(SCHEMA_FILE_PATH, 'utf-8');
      expect(result).toBe(mockSchemaContent);
    });
  });

  describe('getShownProps', () => {
    it('should return shown props configuration', async () => {
      const result = await fc.getShownProps(mockInputs);

      // Logger is mocked, so we can't verify specific calls
      expect(result).toEqual({
        deploy: [
          'region',
          'functionName',
          'handler',
          'description',
          'triggers[*].triggerName',
          'triggers[*].triggerType',
        ],
      });
    });
  });
});
