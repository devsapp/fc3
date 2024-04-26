import SYaml2To3 from '../../src/subCommands/2to3';
import Alias from '../../src/subCommands/alias';
import log from '../../src/logger';
import path from 'path';
import { parseArgv } from '@serverless-devs/utils';
import fs from 'fs';
import yaml from 'js-yaml';
import { IInputs } from '../../src/interface';
log._set(console);

jest.mock('@serverless-devs/utils', () => ({
  parseArgv: jest.fn(),
}));

describe('SYaml2To3', () => {
  let sYaml2To3Class;
  const inputs: IInputs = {
    // 当前执行路径
    cwd: __dirname,
    baseDir: __dirname,
    // 项目名称
    name: 'hello-world-app',
    props: {
      region: process.env.REGION === 'cn-hongkong' ? 'cn-hongkong' : 'cn-huhehaote',
      functionName: 'start-py',
      description: 'hello world by serverless devs',
      runtime: 'python3.9',
      code: './code',
      handler: 'index.handler',
      memorySize: 128,
      timeout: 60,
    },
    // 执行的方法
    command: 's2tos3',
    args: ['-t', 's.yaml'],
    // yaml相关信息
    yaml: {
      path: path.join(__dirname, 's.yaml'),
    },
    // 当前业务模块相关信息
    resource: {
      name: 'hello_world',
      component: 'fc3',
      access: 'default',
    },
    // 已经执行完的业务模块的输出结果
    outputs: {},
    // 获取当前的密钥信息
    getCredential: async () => ({
      AccountID: process.env.DEVS_TEST_UID,
      AccessKeyID: process.env.DEVS_TEST_AK_ID,
      AccessKeySecret: process.env.DEVS_TEST_AK_SECRET,
    }),
  };

  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  beforeEach(() => {
    sYaml2To3Class = () => new SYaml2To3(inputs);
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  describe('constructor', () => {
    it('should return error source is {}', () => {
      (parseArgv as jest.Mock).mockReturnValue({});
      const errorMock = jest.spyOn(log, 'error');

      expect(sYaml2To3Class).toThrow(
        'source not specified and s.yaml or s.yml is not in current dir, please specify --source',
      );
      expect(errorMock).toHaveBeenCalledWith(
        'source not specified and s.yaml or s.yml is not in current dir, please specify --source',
      );
    });
  });

  describe('getSYamlFile', () => {
    let sYaml2To3: SYaml2To3;
    beforeEach(() => {
      (parseArgv as jest.Mock).mockReturnValue({
        source: 's.yaml',
        target: 's3.yaml',
        region: 'cn-hangzhou',
        help: false,
      });
      sYaml2To3 = sYaml2To3Class();
    });

    it('should return the correct file name if s.yaml exists', () => {
      const spy = jest.spyOn(fs, 'accessSync').mockImplementation(() => {});
      const filename = sYaml2To3.getSYamlFile();
      expect(filename).toBe('s.yaml');
      spy.mockRestore();
    });

    it('should return an empty string if both s.yaml and s.yml do not exist', () => {
      const spy = jest.spyOn(fs, 'accessSync').mockImplementation(() => {
        throw new Error();
      });
      const filename = sYaml2To3.getSYamlFile();
      expect(filename).toBe('');
      spy.mockRestore();
    });
  });

  describe('variableReplace', () => {
    let sYaml2To3: SYaml2To3;
    beforeEach(() => {
      (parseArgv as jest.Mock).mockReturnValue({
        source: 's.yaml',
        target: 's3.yaml',
        region: 'cn-hangzhou',
        help: false,
      });
      sYaml2To3 = sYaml2To3Class();
    });
    it('should replace environment variables', () => {
      const fileContents = 'Hello, ${env(NAME)}!';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe("Hello, ${env('NAME')}!");
    });

    it('should replace configuration variables', () => {
      const fileContents = 'The port is ${config(PORT)}.';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe("The port is ${config('PORT')}.");
    });

    it('should replace file variables', () => {
      const fileContents = 'The content is ${file(FILE.txt)}.';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe("The content is ${file('FILE.txt')}.");
    });

    it('should replace output variables', () => {
      const fileContents = '${A.output.xx}';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('${resources.A.output.xx}');
    });

    it('should replace props variables', () => {
      const fileContents = '${A.props.xx}';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('${resources.A.props.xx}');
    });

    it('should not modify other variables', () => {
      const fileContents = 'This is a test. ${otherVariable}';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('This is a test. ${otherVariable}');
    });
  });

  jest.mock('js-yaml');

  describe('run', () => {
    const originalLogDebug = log.debug;
    const originalLogWarn = log.warn;
    let sYaml2To3: SYaml2To3;

    beforeEach(() => {
      (parseArgv as jest.Mock).mockReturnValue({
        source: 's.yaml',
        target: 's3.yaml',
        region: 'cn-hangzhou',
        help: false,
      });
      log.warn = (...args) => {
        originalLogDebug('Error:', ...args);
      };
      sYaml2To3 = sYaml2To3Class();
    });

    afterEach(() => {
      log.debug = originalLogDebug;
      log.warn = originalLogWarn;
    });

    test('parsedYamlData.edition is 3.0.0', async () => {
      const loadMock = jest.spyOn(yaml, 'load');
      const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
      readFileSyncMock.mockReturnValue('');
      loadMock.mockReturnValue({
        edition: '3.0.0',
      });
      await sYaml2To3.run();
      expect(loadMock).toBeCalled();
    });

    test('parsedYamlData.edition is not 3.0.0', async () => {
      const loadMock = jest.spyOn(yaml, 'load');
      const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
      readFileSyncMock.mockReturnValue('');
      const command = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      const args = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      loadMock.mockReturnValue({
        edition: '2.0.0',
        services: {
          service1: {
            runtime: 'custom',
            component: 'devsapp/fc@/fc',
            props: {
              codeUri: 'code',
              region: 'cn-hangzhou',
              service: {
                name: 'service1',
                description: 'service1',
              },
              function: {
                name: 'function1',
                description: 'function1',
                runtime: 'nodejs10',
                codeUri: './',
                handler: 'index.handler',
              },
              ossBucket: 'test',
              ossKey: 'test1',
              environmentVariables: {
                key1: 'value1',
                key2: 'value2',
              },
              gpuMemorySize: 'test',
              asyncConfiguration: {
                destination: {
                  onSuccess: 'acs:fc:::fc-test-on-success',
                  onFailure: 'acs:fc:::fc-test-on-failure',
                },
              },
              caPort: 'test',
              customContainerConfig: {
                image: 'test',
                command,
                args,
                cpu: 1,
                memorySize: 128,
                imagePullPolicy: 'IfNotPresent',
                user: 'test',
                workingDir: 'test',
                environmentVariables: {
                  key1: 'value1',
                  key2: 'value2',
                },
                webServerMode: false,
              },
              customRuntimeConfig: {
                handler: 'test',
                runtime: 'test',
              },
              customHealthCheckConfig: 'test',
              triggers: [
                {
                  name: 'test-trigger',
                  type: 'oss',
                  config: {
                    test: 'test',
                    filter: {
                      Key: {
                        Prefix: 'test',
                        Suffix: 'test',
                      },
                    },
                    bucketName: 'test',
                  },
                  role: 'test',
                },
                {
                  name: 'test-trigger2',
                  type: 'test',
                  config: {
                    test: 'test',
                  },
                  role: 'test',
                },
              ],
              initializer: {
                name: 'test-initializer',
                type: 'test',
              },
              initializationTimeout: 10,
              instanceLifecycleConfig: {
                preFreeze: {
                  test: 'test',
                },
              },
              customDomains: [
                {
                  domainName: 'test.com',
                  protocol: 'HTTP',
                  routeConfigs: [
                    {
                      path: '/test',
                      methods: ['GET'],
                      serviceName: 'test-service',
                      functionName: 'test-function',
                    },
                  ],
                },
              ],
            },
            actions: {
              test: [
                {
                  component: 'fc build --use-docker',
                },
                {
                  component: 'fc invoke',
                },
                {
                  component: 'fc api',
                },
                {
                  component: 'fc invoke --use-docker',
                },
                {
                  component: 'fc ${vars.service} --region ${vars.region}',
                },
              ],
            },
          },
          service2: {
            runtime: 'custom',
            component: 'test',
            props: {
              codeUri: 'code',
              region: 'cn-hangzhou',
              service: {
                name: 'service1',
                description: 'service1',
              },
              function: {
                name: 'function1',
                description: 'function1',
                runtime: 'nodejs10',
                codeUri: './',
                handler: 'index.handler',
              },
              ossBucket: 'test',
              ossKey: 'test1',
              environmentVariables: {},
              gpuMemorySize: 'test',
              asyncConfiguration: {
                destination: {},
              },
              caPort: 'test',
              customContainerConfig: {
                image: 'test',
                command: [],
                args: [],
                cpu: 1,
                memorySize: 128,
                imagePullPolicy: 'IfNotPresent',
                user: 'test',
                workingDir: 'test',
                environmentVariables: {
                  key1: 'value1',
                  key2: 'value2',
                },
                webServerMode: false,
              },
              customRuntimeConfig: {
                handler: 'test',
                runtime: 'test',
              },
              customHealthCheckConfig: 'test',
              triggers: [
                {
                  name: 'test-trigger',
                  type: 'oss',
                  config: {
                    test: 'test',
                    filter: {
                      Key: {
                        Prefix: 'test',
                        Suffix: 'test',
                      },
                    },
                  },
                  role: 'test',
                },
                {
                  name: 'test-trigger2',
                  type: 'test',
                  config: {
                    test: 'test',
                  },
                  role: 'test',
                },
              ],
            },
          },
        },
      });
      const dumpMock = jest.spyOn(yaml, 'dump');
      dumpMock.mockReturnValue('');
      const writeFileSyncMock = jest.spyOn(fs, 'writeFileSync');
      writeFileSyncMock.mockReturnValue();

      await sYaml2To3.run();

      expect(readFileSyncMock).toBeCalled();
      expect(loadMock).toBeCalled();
      expect(dumpMock).toBeCalled();
      expect(writeFileSyncMock).toBeCalled();
    });

    test('service is String', async () => {
      const loadMock = jest.spyOn(yaml, 'load');
      const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
      readFileSyncMock.mockReturnValue('');
      const command = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      const args = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      loadMock.mockReturnValue({
        edition: '2.0.0',
        var: {
          service: {
            name: 'service1',
            description: 'service1',
            nasConfig: {
              mountPoints: [
                {
                  fcDir: 'test',
                  nasDir: 'test',
                },
              ],
            },
            vpcConfig: {
              vswitchIds: ['vswitch-xxxx'],
            },
            vpcBinding: 'test-1',
          },
        },
        services: {
          service1: {
            runtime: 'custom',
            component: 'devsapp/fc@/fc',
            props: {
              codeUri: 'code',
              region: 'cn-hangzhou',
              service: '${var.service}',
              function: {
                name: 'function1',
                description: 'function1',
                runtime: 'nodejs10',
                codeUri: './',
                handler: 'index.handler',
              },
              ossBucket: 'test',
              ossKey: 'test1',
              environmentVariables: {
                key1: 'value1',
                key2: 'value2',
              },
              gpuMemorySize: 'test',
              asyncConfiguration: {
                destination: {
                  onSuccess: 'acs:fc:::fc-test-on-success',
                  onFailure: 'acs:fc:::fc-test-on-failure',
                },
              },
              caPort: 'test',
              customContainerConfig: {
                image: 'test',
                command,
                args,
                cpu: 1,
                memorySize: 128,
                imagePullPolicy: 'IfNotPresent',
                user: 'test',
                workingDir: 'test',
                environmentVariables: {
                  key1: 'value1',
                  key2: 'value2',
                },
                webServerMode: false,
              },
              customRuntimeConfig: {
                handler: 'test',
                runtime: 'test',
              },
              customHealthCheckConfig: 'test',
              triggers: [
                {
                  name: 'test-trigger',
                  type: 'oss',
                  config: {
                    test: 'test',
                    filter: {
                      Key: {
                        Prefix: 'test',
                        Suffix: 'test',
                      },
                    },
                    bucketName: 'test',
                  },
                  role: 'test',
                },
              ],
              initializer: {
                name: 'test-initializer',
                type: 'test',
              },
              initializationTimeout: 10,
              instanceLifecycleConfig: {
                preFreeze: {
                  test: 'test',
                },
              },
              customDomains: [
                {
                  domainName: 'test.com',
                  protocol: 'HTTP',
                  routeConfigs: [
                    {
                      path: '/test',
                      methods: ['GET'],
                      serviceName: 'test-service',
                      functionName: 'test-function',
                    },
                  ],
                },
              ],
            },
            actions: {},
          },
        },
      });
      const dumpMock = jest.spyOn(yaml, 'dump');
      dumpMock.mockReturnValue('');
      const writeFileSyncMock = jest.spyOn(fs, 'writeFileSync');
      writeFileSyncMock.mockReturnValue();

      await sYaml2To3.run();

      expect(readFileSyncMock).toBeCalled();
      expect(loadMock).toBeCalled();
      expect(dumpMock).toBeCalled();
      expect(writeFileSyncMock).toBeCalled();
    });

    test('nasConfig is string,and auto is equal', async () => {
      const loadMock = jest.spyOn(yaml, 'load');
      const readFileSyncMock = jest.spyOn(fs, 'readFileSync');
      readFileSyncMock.mockReturnValue('');
      const command = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      const args = JSON.stringify([
        {
          type: 'string',
          value: 'test',
        },
        {
          type: 'string',
          value: 'test',
        },
      ]);
      loadMock.mockReturnValue({
        edition: '2.0.0',
        var: {
          service: {
            name: 'service1',
            description: 'service1',
            nasConfig: 'AUTO',
          },
        },
        services: {
          service1: {
            runtime: 'custom',
            component: 'devsapp/fc@/fc',
            props: {
              codeUri: 'code',
              region: 'cn-hangzhou',
              service: '${var.service}',
              function: {
                name: 'function1',
                description: 'function1',
                runtime: 'nodejs10',
                codeUri: './',
                handler: 'index.handler',
              },
              ossBucket: 'test',
              ossKey: 'test1',
              gpuMemorySize: 'test',
              asyncConfiguration: {
                destination: {},
              },
              caPort: 'test',
              customContainerConfig: {
                image: 'test',
                command,
                args,
                cpu: 1,
                memorySize: 128,
                imagePullPolicy: 'IfNotPresent',
                user: 'test',
                workingDir: 'test',
                environmentVariables: {
                  key1: 'value1',
                  key2: 'value2',
                },
                webServerMode: false,
              },
              customHealthCheckConfig: 'test',
              triggers: [],
              initializer: {
                name: 'test-initializer',
                type: 'test',
              },
              initializationTimeout: 10,
              instanceLifecycleConfig: {
                preFreeze: {
                  test: 'test',
                },
              },
              customDomains: [],
            },
            actions: {
              test: '',
            },
          },
        },
      });
      const dumpMock = jest.spyOn(yaml, 'dump');
      dumpMock.mockReturnValue('');
      const writeFileSyncMock = jest.spyOn(fs, 'writeFileSync');
      writeFileSyncMock.mockReturnValue();

      await sYaml2To3.run();

      expect(readFileSyncMock).toBeCalled();
      expect(loadMock).toBeCalled();
      expect(dumpMock).toBeCalled();
      expect(writeFileSyncMock).toBeCalled();
    });
  });
});

describe('Alias', () => {
  let alias;
  const inputs: IInputs = {
    // 当前执行路径
    cwd: __dirname,
    baseDir: __dirname,
    // 项目名称
    name: 'hello-world-app',
    props: {
      region: process.env.REGION === 'cn-hongkong' ? 'cn-hongkong' : 'cn-huhehaote',
      functionName: 'start-py',
      description: 'hello world by serverless devs',
      runtime: 'python3.9',
      code: './code',
      handler: 'index.handler',
      memorySize: 128,
      timeout: 60,
    },
    // 执行的方法
    command: 'deploy',
    args: ['-t', 's.yaml'],
    // yaml相关信息
    yaml: {
      path: path.join(__dirname, 's.yaml'),
    },
    // 当前业务模块相关信息
    resource: {
      name: 'hello_world',
      component: 'fc3',
      access: 'default',
    },
    // 已经执行完的业务模块的输出结果
    outputs: {},
    credential: {
      AccountID: '1234567890',
      AccessKeyID: 'accessKeyId',
      AccessKeySecret: 'accessKeySecret',
      SecurityToken: 'securityToken',
    },
    // 获取当前的密钥信息
    getCredential: async () => ({
      AccountID: process.env.DEVS_TEST_UID,
      AccessKeyID: process.env.DEVS_TEST_AK_ID,
      AccessKeySecret: process.env.DEVS_TEST_AK_SECRET,
    }),
  };

  beforeEach(() => {
    alias = () => new Alias(inputs);
  });

  describe('constructor', () => {
    it('should throw error when commandsList have not subCommand', async () => {
      (parseArgv as jest.Mock).mockReturnValue({
        _: ['test'],
      });

      expect(alias).toThrowError(
        'Command "test" not found, Please use "s cli fc3 alias -h" to query how to use the command',
      );
    });
  });
});
