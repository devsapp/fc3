import Service from '../../../../../src/subCommands/deploy/impl/function';
import { IInputs, IFunction } from '../../../../../src/interface';
import { Runtime } from '../../../../../src/interface/base';
import logger from '../../../../../src/logger';
import * as utils from '../../../../../src/utils';
import FC from '../../../../../src/resources/fc';
import Acr from '../../../../../src/resources/acr';
import Sls from '../../../../../src/resources/sls';
import { RamClient } from '../../../../../src/resources/ram';
import VPC_NAS from '../../../../../src/resources/vpc-nas';
import { ICredentials } from '@serverless-devs/component-interface';

// Mocks
jest.mock('@serverless-devs/zip');
jest.mock('@serverless-devs/utils');
jest.mock('@serverless-devs/load-component');
jest.mock('../../../../../src/utils');
jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/resources/acr');
jest.mock('../../../../../src/resources/sls');
jest.mock('../../../../../src/resources/ram');
jest.mock('../../../../../src/resources/vpc-nas');
jest.mock('../../../../../src/resources/oss');

const getRootHomeMock = jest.requireMock('@serverless-devs/utils').getRootHome;
const calculateCRC64Mock = utils.calculateCRC64 as jest.Mock;
const getFileSizeMock = utils.getFileSize as jest.Mock;

// Mock the default export of @serverless-devs/zip
jest.mock('@serverless-devs/zip', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('Service', () => {
  let mockInputs: IInputs;
  let service: Service;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        runtime: 'nodejs12',
        code: './code',
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        Region: 'cn-hangzhou',
      },
      args: [],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;

    mockOpts = {
      yes: true,
    };

    // Setup mocks
    const zipDefaultMock = jest.requireMock('@serverless-devs/zip').default;
    zipDefaultMock.mockResolvedValue({ outputFile: '/tmp/test.zip' });
    getRootHomeMock.mockReturnValue('/root');
    calculateCRC64Mock.mockResolvedValue('crc64-value');
    getFileSizeMock.mockReturnValue(undefined);

    // Mock logger methods
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with function config', () => {
      service = new Service(mockInputs, mockOpts);

      expect(service.type).toBeUndefined();
      expect(service.skipPush).toBeUndefined();
      expect(service.local).toEqual({
        functionName: 'test-function',
        runtime: 'nodejs12',
        code: './code',
      });
    });

    it('should throw error when functionName is not defined', () => {
      const inputsWithoutFunctionName = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          functionName: undefined,
        },
      };

      expect(() => new Service(inputsWithoutFunctionName, mockOpts)).toThrow(
        'Function undefined is not defined',
      );
    });

    it('should unset specific properties from local config', () => {
      const inputsWithAllProperties = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          triggers: [],
          asyncInvokeConfig: {},
          vpcBinding: {},
          customDomain: {},
          provisionConfig: {},
          concurrencyConfig: {},
        } as any,
      };

      service = new Service(inputsWithAllProperties, mockOpts);

      expect(service.local).not.toHaveProperty('region');
      expect(service.local).not.toHaveProperty('triggers');
      expect(service.local).not.toHaveProperty('asyncInvokeConfig');
      expect(service.local).not.toHaveProperty('vpcBinding');
      expect(service.local).not.toHaveProperty('customDomain');
      expect(service.local).not.toHaveProperty('provisionConfig');
      expect(service.local).not.toHaveProperty('concurrencyConfig');
    });
  });

  describe('before', () => {
    it('should call getCredential, getFunction, replaceFunctionConfig, and _plan', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock inputs.getCredential
      service.inputs.getCredential = jest.fn().mockResolvedValue(undefined);

      // Mock fcSdk
      const mockFcSdk = {
        getFunction: jest.fn().mockResolvedValue({ codeChecksum: 'checksum' }),
      };
      Object.defineProperty(service, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock FC.replaceFunctionConfig
      FC.replaceFunctionConfig = jest.fn().mockResolvedValue({
        local: service.local,
        remote: { functionName: 'test-function' },
      });

      const planSpy = jest.spyOn(service as any, '_plan').mockResolvedValue(undefined);

      await service.before();

      expect(service.inputs.getCredential).toHaveBeenCalled();
      expect(service.fcSdk.getFunction).toHaveBeenCalledWith('test-function', 'simple');
      expect(FC.replaceFunctionConfig).toHaveBeenCalledWith(service.local, {});
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should skip deployment when needDeploy is false', async () => {
      service = new Service(mockInputs, mockOpts);
      service.needDeploy = false;

      const result = await service.run();

      expect(result).toBeUndefined();
      expect(logger.debug).toHaveBeenCalledWith(
        'Detection does not require deployment of function, skipping deployment',
      );
    });

    it('should deploy auto resources when type is not code', async () => {
      service = new Service(mockInputs, mockOpts);
      service.needDeploy = true;
      Object.defineProperty(service, 'type', {
        value: 'config',
        writable: true,
      });

      // Mock fcSdk
      const mockFcSdk = {
        deployFunction: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(service, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const deployAutoSpy = jest.spyOn(service as any, '_deployAuto').mockResolvedValue(undefined);
      const uploadCodeSpy = jest.spyOn(service as any, '_uploadCode').mockResolvedValue(true);

      await service.run();

      expect(deployAutoSpy).toHaveBeenCalled();
      expect(uploadCodeSpy).not.toHaveBeenCalled();
      expect(service.fcSdk.deployFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'test-function',
          runtime: 'nodejs12',
          code: './code',
          vpcConfig: {
            securityGroupId: '',
            vSwitchIds: [],
            vpcId: '',
          },
          tracingConfig: {},
          ossMountConfig: {
            mountPoints: [],
          },
          nasConfig: {
            groupId: 0,
            userId: 0,
            mountPoints: [],
          },
          logConfig: {
            enableInstanceMetrics: false,
            enableRequestMetrics: false,
            logBeginRule: 'None',
            logstore: '',
            project: '',
          },
          environmentVariables: {},
          layers: [],
          instanceIsolationMode: 'SHARE',
          sessionAffinity: 'NONE',
        }),
        {
          slsAuto: false,
          type: 'config',
        },
      );
    });

    it('should upload code when type is not config', async () => {
      service = new Service(mockInputs, mockOpts);
      service.needDeploy = true;
      Object.defineProperty(service, 'type', {
        value: 'code',
        writable: true,
      });

      // Mock fcSdk
      const mockFcSdk = {
        deployFunction: jest.fn().mockResolvedValue(undefined),
        uploadCodeToTmpOss: jest
          .fn()
          .mockResolvedValue({ ossBucketName: 'bucket', ossObjectName: 'object' }),
      };
      Object.defineProperty(service, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      const deployAutoSpy = jest.spyOn(service as any, '_deployAuto').mockResolvedValue(undefined);
      const uploadCodeSpy = jest
        .spyOn(service as any, '_uploadCode')
        .mockImplementation(async function (this: any) {
          // 模拟 _uploadCode 方法的行为，更新 code 值
          this.local.code = { ossBucketName: 'bucket', ossObjectName: 'object' };
          return true;
        });

      await service.run();

      expect(deployAutoSpy).not.toHaveBeenCalled();
      expect(uploadCodeSpy).toHaveBeenCalled();
      expect(service.fcSdk.deployFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'test-function',
          runtime: 'nodejs12',
          code: { ossBucketName: 'bucket', ossObjectName: 'object' },
          vpcConfig: {
            securityGroupId: '',
            vSwitchIds: [],
            vpcId: '',
          },
          tracingConfig: {},
          ossMountConfig: {
            mountPoints: [],
          },
          nasConfig: {
            groupId: 0,
            userId: 0,
            mountPoints: [],
          },
          logConfig: {
            enableInstanceMetrics: false,
            enableRequestMetrics: false,
            logBeginRule: 'None',
            logstore: '',
            project: '',
          },
          environmentVariables: {},
          layers: [],
          instanceIsolationMode: 'SHARE',
          sessionAffinity: 'NONE',
        }),
        {
          slsAuto: false,
          type: 'code',
        },
      );
    });
  });

  describe('_getAcr', () => {
    it('should return existing acr instance', () => {
      service = new Service(mockInputs, mockOpts);
      const mockAcr = new Acr(mockInputs.props?.region, mockInputs.credential as ICredentials);
      service.acr = mockAcr;

      const result = (service as any)._getAcr();

      expect(result).toBe(mockAcr);
    });

    it('should create new acr instance when not exists', () => {
      service = new Service(mockInputs, mockOpts);

      const result = (service as any)._getAcr();

      expect(result).toBeInstanceOf(Acr);
      expect(service.acr).toBe(result);
    });
  });

  describe('_plan', () => {
    it('should set needDeploy to true when remote is undefined', async () => {
      service = new Service(mockInputs, mockOpts);
      service.remote = undefined;

      await (service as any)._plan();

      expect(service.needDeploy).toBe(true);
    });

    it('should set needDeploy to true when type is code', async () => {
      service = new Service(mockInputs, mockOpts);
      service.remote = { functionName: 'test-function' };
      Object.defineProperty(service, 'type', {
        value: 'code',
        writable: true,
      });

      await (service as any)._plan();

      expect(service.needDeploy).toBe(true);
    });
  });

  describe('_pushImage', () => {
    it('should skip push when skipPush is true', async () => {
      service = new Service(mockInputs, { ...mockOpts, skipPush: true });

      await (service as any)._pushImage();

      expect(logger.debug).toHaveBeenCalledWith('skip push is true');
    });

    it('should throw error when image is nil', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        runtime: 'custom-container',
        customContainerConfig: {},
      } as IFunction;

      await expect((service as any)._pushImage()).rejects.toThrow(
        'CustomContainerRuntime must have a valid image URL',
      );
    });

    it('should push image when image is from ACR', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        runtime: 'custom-container',
        customContainerConfig: { image: 'registry.cn-hangzhou.aliyuncs.com/test/image' },
      } as IFunction;

      // Mock Acr.isAcrRegistry
      Acr.isAcrRegistry = jest.fn().mockReturnValue(true);

      // Mock _getAcr
      const mockAcr = { pushAcr: jest.fn().mockResolvedValue(undefined) };
      jest.spyOn(service as any, '_getAcr').mockReturnValue(mockAcr);

      await (service as any)._pushImage();

      expect(mockAcr.pushAcr).toHaveBeenCalledWith('registry.cn-hangzhou.aliyuncs.com/test/image');
    });

    it('should log info when image is not from ACR', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        runtime: 'custom-container',
        customContainerConfig: { image: 'docker.io/test/image' },
      } as IFunction;

      // Mock Acr.isAcrRegistry
      Acr.isAcrRegistry = jest.fn().mockReturnValue(false);

      await (service as any)._pushImage();

      expect(logger.info).toHaveBeenCalledWith(
        'By default, the push is skipped if the image is not from an ACR (Aliyun Container Registry) registry.',
      );
    });
  });

  describe('_uploadCode', () => {
    it('should throw error when codeUri is nil', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        code: undefined,
      } as IFunction;

      await expect((service as any)._uploadCode()).rejects.toThrow('Code config is empty');
    });

    it('should return true when codeUri is object with ossBucketName and ossObjectName', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        code: { ossBucketName: 'bucket', ossObjectName: 'object' },
      } as IFunction;

      const result = await (service as any)._uploadCode();

      expect(result).toBe(true);
    });

    it('should throw error when codeUri is object without ossBucketName or ossObjectName', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        code: { ossBucketName: 'bucket' },
      } as IFunction;

      await expect((service as any)._uploadCode()).rejects.toThrow(
        'Code config must be a string or an object containing ossBucketName and ossObject Name',
      );
    });

    it('should upload code when codeUri is string', async () => {
      service = new Service(mockInputs, mockOpts);
      service.local = {
        ...service.local,
        code: './code',
      } as IFunction;
      service.codeChecksum = 'old-checksum';

      // Mock fcSdk
      const mockFcSdk = {
        uploadCodeToTmpOss: jest
          .fn()
          .mockResolvedValue({ ossBucketName: 'bucket', ossObjectName: 'object' }),
      };
      Object.defineProperty(service, 'fcSdk', {
        value: mockFcSdk,
        writable: true,
      });

      // Mock _assertNeedZip
      jest.spyOn(service as any, '_assertNeedZip').mockReturnValue(true);

      const result = await (service as any)._uploadCode();

      expect(result).toBe(true);
      expect(service.local.code).toEqual({ ossBucketName: 'bucket', ossObjectName: 'object' });
    });
  });

  describe('_deployAuto', () => {
    it('should deploy SLS resources when slsAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: true,
        roleAuto: false,
      });

      // Mock Sls
      const mockSls = {
        deploy: jest.fn().mockResolvedValue({ project: 'project', logstore: 'logstore' }),
      };
      jest.mock('../../../../../src/resources/sls');
      (Sls as any).mockImplementation(() => mockSls);

      await (service as any)._deployAuto();

      expect(mockSls.deploy).toHaveBeenCalled();
      expect(service.createResource.sls).toEqual({ project: 'project', logstore: 'logstore' });
      expect(service.local.logConfig).toEqual({
        enableInstanceMetrics: true,
        enableRequestMetrics: true,
        logBeginRule: 'DefaultRegex',
        logstore: 'logstore',
        project: 'project',
      });
    });

    it('should deploy RAM role when roleAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: true,
      });

      // Mock RamClient
      const mockRamClient = {
        initFcDefaultServiceRole: jest.fn().mockResolvedValue('arn:role'),
        initSlrRole: jest.fn().mockResolvedValue(undefined),
      };
      jest.mock('../../../../../src/resources/ram');
      (RamClient as any).mockImplementation(() => mockRamClient);

      await (service as any)._deployAuto();

      expect(mockRamClient.initFcDefaultServiceRole).toHaveBeenCalled();
      expect(service.createResource.role).toEqual({ arn: 'arn:role' });
      expect(service.local.role).toBe('arn:role');
    });

    it.skip('should deploy VPC and NAS resources when nasAuto or vpcAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: true,
        vpcAuto: true,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });

      // Mock RamClient
      const initSlrRoleSpy = jest
        .spyOn(RamClient.prototype, 'initSlrRole')
        .mockResolvedValue(undefined);

      // Mock VPC_NAS
      const mockVpcNas = {
        deploy: jest.fn().mockResolvedValue({
          vpcConfig: { vpcId: 'vpc-id', securityGroupId: 'sg-id', vSwitchIds: ['vsw-id'] },
          mountTargetDomain: 'mount-target',
          fileSystemId: 'fs-id',
        }),
      };
      (VPC_NAS as jest.Mock).mockImplementation(() => mockVpcNas);

      await (service as any)._deployAuto();

      expect(initSlrRoleSpy).toHaveBeenCalledWith('FC');
      expect(mockVpcNas.deploy).toHaveBeenCalledWith({
        nasAuto: true,
        vpcConfig: undefined,
      });
      expect(service.createResource.vpc).toEqual({
        vpcId: 'vpc-id',
        securityGroupId: 'sg-id',
        vSwitchIds: ['vsw-id'],
      });
      expect(service.local.vpcConfig).toEqual({
        vpcId: 'vpc-id',
        securityGroupId: 'sg-id',
        vSwitchIds: ['vsw-id'],
      });
      expect(service.createResource.nas).toEqual({
        mountTargetDomain: 'mount-target',
        fileSystemId: 'fs-id',
      });
      expect(service.local.nasConfig).toEqual({
        groupId: 0,
        userId: 0,
        mountPoints: [
          {
            serverAddr: 'mount-target:/test-function',
            mountDir: '/mnt/test-function',
            enableTLS: false,
          },
        ],
      });
    });
  });

  describe('_deployAuto', () => {
    it('should deploy SLS resources when slsAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: true,
        roleAuto: false,
      });

      // Mock Sls
      const mockSls = {
        deploy: jest.fn().mockResolvedValue({ project: 'project', logstore: 'logstore' }),
      };
      jest.mock('../../../../../src/resources/sls');
      (Sls as any).mockImplementation(() => mockSls);

      await (service as any)._deployAuto();

      expect(mockSls.deploy).toHaveBeenCalled();
      expect(service.createResource.sls).toEqual({ project: 'project', logstore: 'logstore' });
      expect(service.local.logConfig).toEqual({
        enableInstanceMetrics: true,
        enableRequestMetrics: true,
        logBeginRule: 'DefaultRegex',
        logstore: 'logstore',
        project: 'project',
      });
    });

    it('should deploy RAM role when roleAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: true,
      });

      // Mock RamClient
      const mockRamClient = {
        initFcDefaultServiceRole: jest.fn().mockResolvedValue('arn:role'),
        initSlrRole: jest.fn().mockResolvedValue(undefined),
      };
      jest.mock('../../../../../src/resources/ram');
      (RamClient as any).mockImplementation(() => mockRamClient);

      await (service as any)._deployAuto();

      expect(mockRamClient.initFcDefaultServiceRole).toHaveBeenCalled();
      expect(service.createResource.role).toEqual({ arn: 'arn:role' });
      expect(service.local.role).toBe('arn:role');
    });

    it.skip('should deploy VPC and NAS resources when nasAuto or vpcAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: true,
        vpcAuto: true,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });

      // Mock RamClient
      const initSlrRoleSpy = jest
        .spyOn(RamClient.prototype, 'initSlrRole')
        .mockResolvedValue(undefined);

      // Mock VPC_NAS
      const mockVpcNas = {
        deploy: jest.fn().mockResolvedValue({
          vpcConfig: { vpcId: 'vpc-id', securityGroupId: 'sg-id', vSwitchIds: ['vsw-id'] },
          mountTargetDomain: 'mount-target',
          fileSystemId: 'fs-id',
        }),
      };
      (VPC_NAS as jest.Mock).mockImplementation(() => mockVpcNas);

      await (service as any)._deployAuto();

      expect(initSlrRoleSpy).toHaveBeenCalledWith('FC');
      expect(mockVpcNas.deploy).toHaveBeenCalledWith({
        nasAuto: true,
        vpcConfig: undefined,
      });
      expect(service.createResource.vpc).toEqual({
        vpcId: 'vpc-id',
        securityGroupId: 'sg-id',
        vSwitchIds: ['vsw-id'],
      });
      expect(service.local.vpcConfig).toEqual({
        vpcId: 'vpc-id',
        securityGroupId: 'sg-id',
        vSwitchIds: ['vsw-id'],
      });
      expect(service.createResource.nas).toEqual({
        mountTargetDomain: 'mount-target',
        fileSystemId: 'fs-id',
      });
      expect(service.local.nasConfig).toEqual({
        groupId: 0,
        userId: 0,
        mountPoints: [
          {
            serverAddr: 'mount-target:/test-function',
            mountDir: '/mnt/test-function',
            enableTLS: false,
          },
        ],
      });
    });

    it('should deploy OSS resources when ossAuto is true', async () => {
      service = new Service(mockInputs, mockOpts);

      // Mock FC.computeLocalAuto
      FC.computeLocalAuto = jest.fn().mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: true,
      });

      // Mock OSS
      const mockOss = {
        deploy: jest.fn().mockResolvedValue({ ossBucket: 'test-oss-bucket' }),
      };

      // Mock the OSS constructor to return our mock instance
      const OssMock = jest.requireMock('../../../../../src/resources/oss').default;
      OssMock.mockImplementation(() => mockOss);

      await (service as any)._deployAuto();

      expect(OssMock).toHaveBeenCalledWith(
        'cn-hangzhou',
        mockInputs.credential,
        'https://oss-cn-hangzhou.aliyuncs.com',
      );
      expect(mockOss.deploy).toHaveBeenCalled();
      expect(service.createResource.oss).toEqual({ ossBucket: 'test-oss-bucket' });
      expect(service.local.ossMountConfig).toEqual({
        mountPoints: [
          {
            mountDir: `/mnt/test-oss-bucket`,
            bucketName: 'test-oss-bucket',
            endpoint: 'http://oss-cn-hangzhou-internal.aliyuncs.com',
            readOnly: false,
          },
        ],
      });
    });

    describe('_assertNeedZip', () => {
      it('should return false for .jar file with official runtime', () => {
        service = new Service(mockInputs, mockOpts);
        service.local = {
          ...service.local,
          runtime: 'nodejs12',
        } as IFunction;

        const result = (service as any)._assertNeedZip('test.jar');

        expect(result).toBe(false);
      });

      it('should return true for .jar file with custom runtime and java -jar command', () => {
        service = new Service(mockInputs, mockOpts);
        service.local = {
          ...service.local,
          runtime: Runtime.custom,
          customRuntimeConfig: {
            command: ['java'],
            args: ['-jar', 'app.jar'],
          },
        } as IFunction;

        // Mock FC.isCustomRuntime
        FC.isCustomRuntime = jest.fn().mockReturnValue(true);

        const result = (service as any)._assertNeedZip('test.jar');

        expect(result).toBe(true);
      });

      it('should return false for .zip file', () => {
        service = new Service(mockInputs, mockOpts);

        const result = (service as any)._assertNeedZip('test.zip');

        expect(result).toBe(false);
      });

      it('should return false for .war file', () => {
        service = new Service(mockInputs, mockOpts);

        const result = (service as any)._assertNeedZip('test.war');

        expect(result).toBe(false);
      });

      it('should return true for other file types', () => {
        service = new Service(mockInputs, mockOpts);

        const result = (service as any)._assertNeedZip('test.js');

        expect(result).toBe(true);
      });
    });

    describe('_assertArrayOfStrings', () => {
      it('should not throw error for array of strings', () => {
        service = new Service(mockInputs, mockOpts);

        expect(() => (service as any)._assertArrayOfStrings(['a', 'b', 'c'])).not.toThrow();
      });

      it('should throw error for non-array', () => {
        service = new Service(mockInputs, mockOpts);

        expect(() => (service as any)._assertArrayOfStrings('not-array')).toThrow(
          'Variable must be an array',
        );
      });

      it('should throw error for array with non-string elements', () => {
        service = new Service(mockInputs, mockOpts);

        expect(() => (service as any)._assertArrayOfStrings(['a', 1, 'c'])).toThrow(
          'Variable must contain only strings',
        );
      });
    });
  });
});
