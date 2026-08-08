import SYaml2To3 from '../../../../src/subCommands/2to3';
import { IInputs } from '../../../../src/interface';
import { parseArgv } from '@serverless-devs/utils';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

jest.mock('@serverless-devs/utils', () => ({
  parseArgv: jest.fn(),
}));

jest.mock('../../../../src/logger', () => {
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

describe('SYaml2To3', () => {
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
      command: 's2tos3',
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
    (parseArgv as jest.Mock).mockReturnValue({
      source: 's.yaml',
      target: 's3.yaml',
      region: 'cn-hangzhou',
      help: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should resolve absolute source and target paths from baseDir', () => {
      const s = new SYaml2To3(mockInputs);
      expect(s.source).toBe(path.join('/test', 's.yaml'));
      expect(s.target).toBe(path.join('/test', 's3.yaml'));
    });

    it('should keep absolute paths untouched', () => {
      (parseArgv as jest.Mock).mockReturnValue({
        source: '/abs/in.yaml',
        target: '/abs/out.yaml',
        help: false,
      });
      const s = new SYaml2To3(mockInputs);
      expect(s.source).toBe('/abs/in.yaml');
      expect(s.target).toBe('/abs/out.yaml');
    });

    it('should default the target to s3.yaml when not specified', () => {
      (parseArgv as jest.Mock).mockReturnValue({ source: 's.yaml', help: false });
      const s = new SYaml2To3(mockInputs);
      expect(s.target).toBe(path.join('/test', 's3.yaml'));
    });

    it('should fall back to process.cwd() when baseDir is missing', () => {
      mockInputs.baseDir = undefined as any;
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue('/from-cwd');
      const s = new SYaml2To3(mockInputs);
      expect(s.baseDir).toBe('/from-cwd');
      cwdSpy.mockRestore();
    });

    it('should throw when no source is specified and no s.yaml/s.yml exists', () => {
      (parseArgv as jest.Mock).mockReturnValue({ help: false });
      jest.spyOn(fs, 'accessSync').mockImplementation(() => {
        throw new Error('missing');
      });
      expect(() => new SYaml2To3(mockInputs)).toThrow(
        'source not specified and s.yaml or s.yml is not in current dir, please specify --source',
      );
    });
  });

  describe('getSYamlFile', () => {
    it('should return s.yaml when it exists', () => {
      const s = new SYaml2To3(mockInputs);
      jest.spyOn(fs, 'accessSync').mockImplementation(() => {});
      expect(s.getSYamlFile()).toBe('s.yaml');
    });

    it('should return an empty string when neither file exists', () => {
      const s = new SYaml2To3(mockInputs);
      jest.spyOn(fs, 'accessSync').mockImplementation(() => {
        throw new Error('missing');
      });
      expect(s.getSYamlFile()).toBe('');
    });
  });

  describe('variableReplace', () => {
    let s: SYaml2To3;
    beforeEach(() => {
      s = new SYaml2To3(mockInputs);
    });

    it('should quote env() variables', () => {
      expect(s.variableReplace('${env(NAME)}')).toBe("${env('NAME')}");
    });

    it('should quote env.X dot access', () => {
      expect(s.variableReplace('${env.NAME}')).toBe("${env('NAME')}");
    });

    it('should quote config() variables', () => {
      expect(s.variableReplace('${config(PORT)}')).toBe("${config('PORT')}");
    });

    it('should quote file() variables', () => {
      expect(s.variableReplace('${file(a.txt)}')).toBe("${file('a.txt')}");
    });

    it('should rewrite output references to resources.*', () => {
      expect(s.variableReplace('${A.output.x}')).toBe('${resources.A.output.x}');
    });

    it('should rewrite props references to resources.*', () => {
      expect(s.variableReplace('${A.props.x}')).toBe('${resources.A.props.x}');
    });

    it('should leave unrelated variables unchanged', () => {
      expect(s.variableReplace('${otherVariable}')).toBe('${otherVariable}');
    });
  });

  describe('run', () => {
    it('should short-circuit when the source edition is already 3.0.0', async () => {
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      const loadSpy = jest.spyOn(yaml, 'load').mockReturnValue({ edition: '3.0.0' } as any);
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const s = new SYaml2To3(mockInputs);
      await s.run();

      expect(readSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('should transform a 2.0 fc service (object form) and write the result', async () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      const command = JSON.stringify(['/bin/sh']);
      const args = JSON.stringify(['-c']);
      jest.spyOn(yaml, 'load').mockReturnValue({
        edition: '2.0.0',
        services: {
          svc1: {
            component: 'devsapp/fc',
            props: {
              region: 'cn-hangzhou',
              service: {
                name: 'service1',
                description: 'my service',
                nasConfig: {
                  mountPoints: [{ serverAddr: 'addr', nasDir: '/nas', fcDir: '/mnt' }],
                },
                vpcConfig: { vswitchIds: ['vsw-1'], vpcId: 'vpc-1' },
              },
              function: {
                name: 'function1',
                runtime: 'custom',
                codeUri: './code',
                handler: 'index.handler',
              },
              ossBucket: 'bkt',
              ossKey: 'key',
              gpuMemorySize: 16384,
              asyncConfiguration: {
                destination: {
                  onSuccess: 'acs:fc:::fc-on-success',
                  onFailure: 'acs:fc:::fc-on-failure',
                },
              },
              caPort: 9000,
              customContainerConfig: {
                image: 'img',
                command,
                args,
                webServerMode: false,
              },
              customHealthCheckConfig: { path: '/health' },
              triggers: [
                {
                  name: 'oss-trigger',
                  type: 'oss',
                  config: {
                    filter: { Key: { Prefix: 'p', Suffix: 's' } },
                    bucketName: 'bkt',
                  },
                  role: 'acs:ram::role',
                },
              ],
              customDomains: [
                {
                  domainName: 'test.com',
                  protocol: 'HTTP',
                  routeConfigs: [{ path: '/', serviceName: 'service1', functionName: 'function1' }],
                },
              ],
            },
            actions: {
              'pre-deploy': [{ component: 'fc build --use-docker' }, { component: 'fc invoke' }],
              'empty-action': '',
            },
          },
        },
      } as any);
      const dumpSpy = jest.spyOn(yaml, 'dump').mockReturnValue('dumped-yaml');
      const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const s = new SYaml2To3(mockInputs);
      await s.run();

      expect(dumpSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalledWith(path.join('/test', 's3.yaml'), 'dumped-yaml');

      // Inspect the transformed object handed to yaml.dump
      const transformed = dumpSpy.mock.calls[0][0] as any;
      expect(transformed.edition).toBe('3.0.0');
      expect(transformed.services).toBeUndefined();
      const svc = transformed.resources.svc1;
      expect(svc.component).toBe('fc3');
      expect(svc.props.functionName).toBe('service1$function1');
      // gpu config derived from gpuMemorySize
      expect(svc.props.gpuConfig).toEqual({
        gpuMemorySize: 16384,
        gpuType: 'fc.gpu.tesla.1',
      });
      // oss code block
      expect(svc.props.code).toEqual({ ossBucketName: 'bkt', ossObjectName: 'key' });
      // trigger renamed fields
      expect(svc.props.triggers[0].triggerName).toBe('oss-trigger');
      expect(svc.props.triggers[0].triggerType).toBe('oss');
      // a fc3-domain resource is generated from customDomains
      expect(transformed.resources.fc3_domain_0.component).toBe('fc3-domain');
    });

    it('should resolve a service referenced by ${var.service} string form', async () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      jest.spyOn(yaml, 'load').mockReturnValue({
        edition: '2.0.0',
        var: {
          service: { name: 'service1', description: 'svc', nasConfig: 'AUTO' },
        },
        services: {
          svc1: {
            component: 'devsapp/fc',
            props: {
              region: 'cn-hangzhou',
              service: '${var.service}',
              function: {
                name: 'function1',
                runtime: 'custom',
                codeUri: './code',
                handler: 'index.handler',
              },
            },
            actions: {},
          },
        },
      } as any);
      const dumpSpy = jest.spyOn(yaml, 'dump').mockReturnValue('dumped');
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const s = new SYaml2To3(mockInputs);
      await s.run();

      const transformed = dumpSpy.mock.calls[0][0] as any;
      const svc = transformed.resources.svc1;
      // service supplied by template extend
      expect(svc.extend).toEqual({ name: 'template_service1' });
      expect(transformed.template.template_service1.nasConfig).toBe('auto');
      expect(svc.props.functionName).toBe('service1$function1');
    });

    it('should transform a standalone fc-domain component', async () => {
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      jest.spyOn(yaml, 'load').mockReturnValue({
        edition: '2.0.0',
        services: {
          domain1: {
            component: 'devsapp/fc-domain',
            props: {
              region: 'cn-hangzhou',
              customDomain: {
                domainName: 'test.com',
                protocol: 'HTTP',
                routeConfigs: [{ path: '/', serviceName: 'service1', functionName: 'function1' }],
              },
            },
          },
        },
      } as any);
      const dumpSpy = jest.spyOn(yaml, 'dump').mockReturnValue('dumped');
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      const s = new SYaml2To3(mockInputs);
      await s.run();

      const transformed = dumpSpy.mock.calls[0][0] as any;
      const domain = transformed.resources.domain1;
      expect(domain.component).toBe('fc3-domain');
      expect(domain.props.routeConfig.routes[0].functionName).toBe('service1$function1');
      expect(domain.props.routeConfig.routes[0].serviceName).toBeUndefined();
    });

    it('should propagate errors thrown while reading the source file', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('read failed');
      });
      const s = new SYaml2To3(mockInputs);
      await expect(s.run()).rejects.toThrow('read failed');
    });
  });
});
