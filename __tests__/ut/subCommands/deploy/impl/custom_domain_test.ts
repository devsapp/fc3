import CustomDomain from '../../../../../src/subCommands/deploy/impl/custom_domain';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';
import * as utils from '../../../../../src/utils';
import { FC3_DOMAIN_COMPONENT_NAME } from '../../../../../src/constant';

// Mocks
jest.mock('@serverless-devs/load-component');
jest.mock('../../../../../src/utils');

const loadComponentMock = jest.requireMock('@serverless-devs/load-component');
const transformCustomDomainPropsMock = utils.transformCustomDomainProps as jest.Mock;

describe('CustomDomain', () => {
  let mockInputs: IInputs;
  let customDomain: CustomDomain;
  let mockDomainInstance: any;
  let mockOpts: any;

  beforeEach(() => {
    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        customDomain: {
          domainName: 'test.example.com',
          protocol: 'HTTP',
          route: {
            path: '/test',
            functionName: 'test-function',
          },
        },
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

    // Mock domain instance
    mockDomainInstance = {
      info: jest.fn(),
      deploy: jest.fn(),
    };

    // Setup mocks
    loadComponentMock.default.mockResolvedValue(mockDomainInstance);
    transformCustomDomainPropsMock.mockImplementation((local, region, functionName) => ({
      ...local,
      region,
      functionName,
    }));

    // Mock logger methods
    logger.debug = jest.fn();
    logger.info = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize correctly with custom domain config', () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);

      expect(customDomain.functionName).toBe('test-function');
      expect(customDomain.local).toEqual((mockInputs.props as any)?.customDomain);
    });

    it('should initialize correctly with empty custom domain config', () => {
      const inputsWithoutCustomDomain = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          customDomain: {},
        },
      };

      customDomain = new CustomDomain(inputsWithoutCustomDomain, mockOpts);

      expect(customDomain.functionName).toBe('test-function');
      expect(customDomain.local).toEqual({});
    });
  });

  describe('_handle_custom_domain', () => {
    it('should handle custom domain setup with local config', async () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);
      await customDomain._handle_custom_domain();

      expect(loadComponentMock.default).toHaveBeenCalledWith(FC3_DOMAIN_COMPONENT_NAME, { logger });
      expect(customDomain.domainInstance).toBe(mockDomainInstance);
      expect(customDomain.customDomainInputs.props).toEqual({
        ...(mockInputs.props as any)?.customDomain,
        region: 'cn-hangzhou',
        functionName: 'test-function',
      });
    });

    it('should handle custom domain setup without local config', async () => {
      const inputsWithoutCustomDomain = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          customDomain: {},
        },
      };

      customDomain = new CustomDomain(inputsWithoutCustomDomain, mockOpts);
      await customDomain._handle_custom_domain();

      expect(loadComponentMock.default).toHaveBeenCalledWith(FC3_DOMAIN_COMPONENT_NAME, { logger });
      expect(customDomain.domainInstance).toBe(mockDomainInstance);
      expect(customDomain.customDomainInputs.props).toEqual({ region: 'cn-hangzhou' });
    });
  });

  describe('before', () => {
    it('should call _handle_custom_domain', async () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);
      const handleCustomDomainSpy = jest.spyOn(customDomain, '_handle_custom_domain');

      await customDomain.before();

      expect(handleCustomDomainSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('should return true when local config is empty', async () => {
      const inputsWithoutCustomDomain = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          customDomain: {},
        },
      };

      customDomain = new CustomDomain(inputsWithoutCustomDomain, mockOpts);
      await customDomain._handle_custom_domain();

      const result = await customDomain.run();

      expect(result).toBe(true);
    });

    it('should deploy new domain when DomainNameNotFound error occurs', async () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);
      await customDomain._handle_custom_domain();

      mockDomainInstance.info.mockRejectedValue(new Error('DomainNameNotFound'));
      mockDomainInstance.deploy.mockResolvedValue({ domainName: 'test.example.com' });

      const result = await customDomain.run();

      expect(mockDomainInstance.info).toHaveBeenCalled();
      expect(mockDomainInstance.deploy).toHaveBeenCalled();
      expect(result).toEqual({ domainName: 'test.example.com' });
    });

    it('should throw error when non-DomainNameNotFound error occurs', async () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);
      await customDomain._handle_custom_domain();

      const errorMessage = 'Some other error';
      mockDomainInstance.info.mockRejectedValue(new Error(errorMessage));

      await expect(customDomain.run()).rejects.toThrow(errorMessage);
    });

    it('should update existing domain routes', async () => {
      customDomain = new CustomDomain(mockInputs, mockOpts);
      await customDomain._handle_custom_domain();

      const onlineCustomDomain = {
        domainName: 'test.example.com',
        protocol: 'HTTP',
        routeConfig: {
          routes: [
            {
              path: '/existing',
              functionName: 'existing-function',
            },
          ],
        },
      };

      mockDomainInstance.info.mockResolvedValue(onlineCustomDomain);
      mockDomainInstance.deploy.mockResolvedValue({ domainName: 'test.example.com' });

      const result = await customDomain.run();

      expect(mockDomainInstance.info).toHaveBeenCalled();
      expect(mockDomainInstance.deploy).toHaveBeenCalled();
      expect(result).toEqual({ domainName: 'test.example.com' });
    });

    it('should handle HTTP protocol correctly', async () => {
      const inputsWithHTTP = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          customDomain: {
            ...(mockInputs.props as any)?.customDomain,
            protocol: 'HTTP',
          },
        },
      };

      customDomain = new CustomDomain(inputsWithHTTP, mockOpts);
      await customDomain._handle_custom_domain();

      const onlineCustomDomain = {
        domainName: 'test.example.com',
        protocol: 'HTTPS',
        routeConfig: {
          routes: [],
        },
      };

      mockDomainInstance.info.mockResolvedValue(onlineCustomDomain);
      mockDomainInstance.deploy.mockResolvedValue({ domainName: 'test.example.com' });

      const result = await customDomain.run();

      expect(mockDomainInstance.info).toHaveBeenCalled();
      expect(mockDomainInstance.deploy).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            protocol: 'HTTP,HTTPS',
          }),
        }),
      );
      expect(result).toEqual({ domainName: 'test.example.com' });
    });

    it('should handle certConfig, tlsConfig, authConfig, and wafConfig', async () => {
      const inputsWithConfigs = {
        ...mockInputs,
        props: {
          ...mockInputs.props,
          customDomain: {
            ...(mockInputs.props as any)?.customDomain,
            certConfig: { certId: 'cert-123' },
            tlsConfig: { minVersion: 'TLSv1.2' },
            authConfig: { authType: 'anonymous' },
            wafConfig: { enable: true },
          },
        },
      };

      customDomain = new CustomDomain(inputsWithConfigs, mockOpts);
      await customDomain._handle_custom_domain();

      const onlineCustomDomain = {
        domainName: 'test.example.com',
        protocol: 'HTTP',
        routeConfig: {
          routes: [],
        },
        certConfig: { certId: 'old-cert-456' },
        tlsConfig: { minVersion: 'TLSv1.1' },
        authConfig: { authType: 'function' },
        wafConfig: { enable: false },
      };

      mockDomainInstance.info.mockResolvedValue(onlineCustomDomain);
      mockDomainInstance.deploy.mockResolvedValue({ domainName: 'test.example.com' });

      const result = await customDomain.run();

      expect(mockDomainInstance.info).toHaveBeenCalled();
      expect(mockDomainInstance.deploy).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            certConfig: { certId: 'cert-123' },
            tlsConfig: { minVersion: 'TLSv1.2' },
            authConfig: { authType: 'anonymous' },
            wafConfig: { enable: true },
          }),
        }),
      );
      expect(result).toEqual({ domainName: 'test.example.com' });
    });
  });
});
