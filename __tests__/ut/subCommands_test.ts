import SYaml2To3 from '../../src/subCommands/2to3';
import log from '../../src/logger';
import path from 'path';
import { parseArgv } from '@serverless-devs/utils';
import fs from 'fs';
import { IInputs } from '../../src/interface';
log._set(console)

jest.mock('@serverless-devs/utils', () => ({
  parseArgv: jest.fn(),
}))

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
    // 获取当前的密钥信息
    getCredential: async () => ({
      AccountID: process.env.DEVS_TEST_UID,
      AccessKeyID: process.env.DEVS_TEST_AK_ID,
      AccessKeySecret: process.env.DEVS_TEST_AK_SECRET,
    }),
  };

  const originalLogDebug = log.debug
  const originalLogError = log.error

  afterEach(() => {
    log.debug = originalLogDebug
    log.error = originalLogError
  });

  beforeEach(() => {
    sYaml2To3Class = () => new SYaml2To3(inputs);
    log.error = (...args) => {
      originalLogDebug('Error:', ...args)
    }
  });

  describe('constructor', () => {
    it('should return error source is {}', () => {
      (parseArgv as jest.Mock).mockReturnValue({})
      const errorMock = jest.spyOn(log, 'error');

      expect(sYaml2To3Class).toThrow('source not specified and s.yaml or s.yml is not in current dir, please specify --source');
      expect(errorMock).toHaveBeenCalledWith('source not specified and s.yaml or s.yml is not in current dir, please specify --source')
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
      })
      sYaml2To3 = sYaml2To3Class()
    })

    it('should return the correct file name if s.yaml exists', () => {
      const spy = jest.spyOn(fs, 'accessSync').mockImplementation(() => { });
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
      })
      sYaml2To3 = sYaml2To3Class()
    })
    it('should replace environment variables', () => {
      const fileContents = 'Hello, ${env(NAME)}!';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('Hello, ${env(\'NAME\')}!');
    });

    it('should replace configuration variables', () => {
      const fileContents = 'The port is ${config(PORT)}.';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('The port is ${config(\'PORT\')}.');
    });

    it('should replace file variables', () => {
      const fileContents = 'The content is ${file(FILE.txt)}.';
      const result = sYaml2To3.variableReplace(fileContents);
      expect(result).toBe('The content is ${file(\'FILE.txt\')}.');
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
});
