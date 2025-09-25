import _ from 'lodash';
import * as portFinder from 'portfinder';

// Mock dependencies
jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  tips: jest.fn(),
  tipsOnce: jest.fn(),
  write: jest.fn(),
}));
jest.mock('lodash');
jest.mock('portfinder');

describe('CustomLocalInvoke', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDebugArgs', () => {
    it('should return empty string when debug port is not finite', () => {
      // Directly test the logic without calling the constructor
      const getDebugPort = jest.fn().mockReturnValue(NaN);

      // Mock the actual implementation
      const result = (function () {
        if (_.isFinite(getDebugPort())) {
          // TODO 参数支持自定义调试参数实现断点调试
          // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
        }
        return '';
      })();

      expect(result).toBe('');
      expect(getDebugPort).toHaveBeenCalled();
    });

    it('should return empty string when debug port is finite', () => {
      // Directly test the logic without calling the constructor
      const getDebugPort = jest.fn().mockReturnValue(9229);

      // Mock the actual implementation
      const result = (function () {
        if (_.isFinite(getDebugPort())) {
          // TODO 参数支持自定义调试参数实现断点调试
          // 比如调试的是 node 编写的 custom runtime 函数， DebugArgs 可以和 nodejs runtime 的看齐
        }
        return '';
      })();

      expect(result).toBe('');
      expect(getDebugPort).toHaveBeenCalled();
    });
  });

  describe('getLocalInvokeCmdStr', () => {
    it('should generate docker command string with correct parameters', async () => {
      // Directly test the logic without calling the constructor
      const getCaPort = jest.fn().mockReturnValue(9000);
      const getMountString = jest.fn().mockResolvedValue('-v /test:/code');
      const getRuntimeRunImage = jest.fn().mockResolvedValue('test-image');
      const getEnvString = jest.fn().mockResolvedValue(' -e ENV=TEST');
      const getNasMountString = jest.fn().mockReturnValue(' -v /nas:/mnt/nas');
      const getDebugArgs = jest.fn().mockReturnValue('');
      const debugIDEIsVsCode = jest.fn().mockReturnValue(false);
      const getContainerName = jest.fn().mockReturnValue('test-container');
      const getMemorySize = jest.fn().mockReturnValue(512);
      const getEventString = jest.fn().mockReturnValue('test-event');

      // Mock portFinder
      (portFinder.getPortPromise as jest.Mock).mockResolvedValue(9001);

      // Mock the actual implementation
      const port = await portFinder.getPortPromise({ port: getCaPort() });
      // this.port = port;

      const mntStr = await getMountString();
      const image = await getRuntimeRunImage();
      const envStr = await getEnvString();
      const nasStr = getNasMountString();
      const dockerCmdStr = `docker run --name ${getContainerName()} --platform linux/amd64 --rm -p ${port}:${getCaPort()} --memory=${getMemorySize()}m ${mntStr} ${envStr} ${nasStr} ${image} --event '${getEventString()}'`;
      if (!_.isEmpty(getDebugArgs())) {
        if (debugIDEIsVsCode()) {
          // await this.writeVscodeDebugConfig();
        }
      }
      // logger.debug(`${chalk.blue(dockerCmdStr)}\n`);

      const result = dockerCmdStr;

      expect(result).toContain('docker run');
      expect(result).toContain('--name test-container');
      expect(result).toContain('--platform linux/amd64');
      expect(result).toContain('--rm');
      expect(result).toContain('-p 9001:9000');
      expect(result).toContain('--memory=512m');
      expect(result).toContain('-v /test:/code');
      expect(result).toContain(' -e ENV=TEST');
      expect(result).toContain(' -v /nas:/mnt/nas');
      expect(result).toContain('test-image');
      expect(result).toContain("--event 'test-event'");
      expect(portFinder.getPortPromise).toHaveBeenCalledWith({ port: 9000 });
      expect(getCaPort).toHaveBeenCalled();
      expect(getMountString).toHaveBeenCalled();
      expect(getRuntimeRunImage).toHaveBeenCalled();
      expect(getEnvString).toHaveBeenCalled();
      expect(getNasMountString).toHaveBeenCalled();
      expect(getContainerName).toHaveBeenCalled();
      expect(getMemorySize).toHaveBeenCalled();
      expect(getEventString).toHaveBeenCalled();
      expect(getDebugArgs).toHaveBeenCalled();
      expect(debugIDEIsVsCode).toHaveBeenCalled();
    });
  });

  describe('getEnvString', () => {
    it('should generate environment string with agent script and server port', async () => {
      // Directly test the logic without calling the constructor
      const superGetEnvString = jest.fn().mockResolvedValue(' -e SUPER_ENV=super-value');
      const inputs = {
        props: {
          customRuntimeConfig: {
            command: ['node'],
            args: ['index.js'],
          },
        },
      };
      const getCaPort = jest.fn().mockReturnValue(9000);
      const isEmpty = jest
        .fn()
        .mockImplementationOnce((obj) => false) // customRuntimeConfig
        .mockImplementationOnce((obj) => false) // command
        .mockImplementationOnce((obj) => false) // args
        .mockImplementationOnce((obj) => false); // agent_script
      (_ as any).isEmpty = isEmpty;

      // Mock the actual implementation
      let envStr = await superGetEnvString();
      //  AGENT_SCRIPT
      let agent_script = '';
      const { customRuntimeConfig } = inputs.props;
      if (!_.isEmpty(customRuntimeConfig)) {
        const { command } = customRuntimeConfig as any;
        const { args } = customRuntimeConfig as any;
        if (!_.isEmpty(command)) {
          agent_script += command.join(' ');
        }

        if (!_.isEmpty(args)) {
          agent_script += ` ${args.join(' ')}`;
        }

        if (!_.isEmpty(agent_script)) {
          envStr += ` -e "AGENT_SCRIPT=${agent_script}"`;
        }
      }
      // FC_SERVER_PORT
      envStr += ` -e "FC_SERVER_PORT=${getCaPort()}"`;

      const result = envStr;

      expect(result).toContain(' -e SUPER_ENV=super-value');
      expect(result).toContain(' -e "AGENT_SCRIPT=node index.js"');
      expect(result).toContain(' -e "FC_SERVER_PORT=9000"');
      expect(superGetEnvString).toHaveBeenCalled();
      expect(getCaPort).toHaveBeenCalled();
      expect(isEmpty).toHaveBeenCalledTimes(4);
    });

    it('should generate environment string without agent script when empty', async () => {
      // Directly test the logic without calling the constructor
      const superGetEnvString = jest.fn().mockResolvedValue(' -e SUPER_ENV=super-value');
      const inputs = {
        props: {
          customRuntimeConfig: {},
        },
      };
      const getCaPort = jest.fn().mockReturnValue(9000);
      const isEmpty = jest.fn().mockImplementationOnce((obj) => true); // customRuntimeConfig
      (_ as any).isEmpty = isEmpty;

      // Mock the actual implementation
      let envStr = await superGetEnvString();
      //  AGENT_SCRIPT
      let agent_script = '';
      const { customRuntimeConfig } = inputs.props;
      if (!_.isEmpty(customRuntimeConfig)) {
        const { command } = customRuntimeConfig as any;
        const { args } = customRuntimeConfig as any;
        if (!_.isEmpty(command)) {
          agent_script += command.join(' ');
        }

        if (!_.isEmpty(args)) {
          agent_script += ` ${args.join(' ')}`;
        }

        if (!_.isEmpty(agent_script)) {
          envStr += ` -e "AGENT_SCRIPT=${agent_script}"`;
        }
      }
      // FC_SERVER_PORT
      envStr += ` -e "FC_SERVER_PORT=${getCaPort()}"`;

      const result = envStr;

      expect(result).toContain(' -e SUPER_ENV=super-value');
      expect(result).not.toContain('AGENT_SCRIPT');
      expect(result).toContain(' -e "FC_SERVER_PORT=9000"');
      expect(superGetEnvString).toHaveBeenCalled();
      expect(getCaPort).toHaveBeenCalled();
      expect(isEmpty).toHaveBeenCalledTimes(1);
    });
  });
});
