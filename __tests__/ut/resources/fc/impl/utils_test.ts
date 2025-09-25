import {
  isCustomContainerRuntime,
  isCustomRuntime,
  getRemoteResourceConfig,
  computeLocalAuto,
  getCustomEndpoint,
} from '../../../../../src/resources/fc/impl/utils';
import { INasConfig, IVpcConfig, ILogConfig, IOssMountConfig } from '../../../../../src/interface';
import * as utils from '../../../../../src/utils';
import { isDebugMode } from '@serverless-devs/utils';

// Mock external dependencies
jest.mock('../../../../../src/utils');
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('@serverless-devs/utils');

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCustomContainerRuntime', () => {
    it('should return true for custom-container runtime', () => {
      const result = isCustomContainerRuntime('custom-container');
      expect(result).toBe(true);
    });

    it('should return false for non custom-container runtime', () => {
      const result = isCustomContainerRuntime('nodejs18');
      expect(result).toBe(false);
    });
  });

  describe('isCustomRuntime', () => {
    it('should return true for custom runtime', () => {
      const result = isCustomRuntime('custom');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian10 runtime', () => {
      const result = isCustomRuntime('custom.debian10');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian11 runtime', () => {
      const result = isCustomRuntime('custom.debian11');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian12 runtime', () => {
      const result = isCustomRuntime('custom.debian12');
      expect(result).toBe(true);
    });

    it('should return false for non-custom runtime', () => {
      const result = isCustomRuntime('nodejs18');
      expect(result).toBe(false);
    });
  });

  describe('getRemoteResourceConfig', () => {
    it('should extract remote resource configurations correctly', () => {
      const mockRemote = {
        nasConfig: { mountPoints: [] } as INasConfig,
        vpcConfig: { vpcId: 'test-vpc' } as IVpcConfig,
        logConfig: { project: 'test-project' } as ILogConfig,
        ossMountConfig: { mountPoints: [] } as IOssMountConfig,
        role: 'test-role',
      };

      const result = getRemoteResourceConfig(mockRemote);

      expect(result).toEqual({
        remoteNasConfig: mockRemote.nasConfig,
        remoteVpcConfig: mockRemote.vpcConfig,
        remoteLogConfig: mockRemote.logConfig,
        remoteRole: mockRemote.role,
        remoteOssConfig: mockRemote.ossMountConfig,
      });
    });

    it('should handle undefined remote config', () => {
      const result = getRemoteResourceConfig(undefined);

      expect(result).toEqual({
        remoteNasConfig: undefined,
        remoteVpcConfig: undefined,
        remoteLogConfig: undefined,
        remoteRole: undefined,
        remoteOssConfig: undefined,
      });
    });
  });

  describe('computeLocalAuto', () => {
    it('should compute auto resources correctly', () => {
      const mockLocal = {
        nasConfig: 'auto',
        vpcConfig: 'auto',
        logConfig: 'auto',
        ossMountConfig: 'auto',
        role: 'auto',
      };

      (utils.isAuto as jest.Mock).mockImplementation((config) => config === 'auto');
      (utils.isAutoVpcConfig as jest.Mock).mockImplementation((config) => config === 'auto');

      const result = computeLocalAuto(mockLocal);

      expect(result).toEqual({
        nasAuto: true,
        vpcAuto: true,
        slsAuto: true,
        roleAuto: true,
        ossAuto: true,
      });

      expect(utils.isAuto).toHaveBeenCalledWith('auto');
      expect(utils.isAutoVpcConfig).toHaveBeenCalledWith('auto');
    });

    it('should handle empty local config', () => {
      const mockLocal = {};

      (utils.isAuto as jest.Mock).mockReturnValue(false);
      (utils.isAutoVpcConfig as jest.Mock).mockReturnValue(false);

      const result = computeLocalAuto(mockLocal);

      expect(result).toEqual({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });
    });
  });

  describe('getCustomEndpoint', () => {
    it('should return protocol only when no custom endpoint is provided', () => {
      const result = getCustomEndpoint(undefined);
      expect(result).toEqual({ protocol: 'https' });
    });

    it('should handle http:// custom endpoint', () => {
      const result = getCustomEndpoint('http://test.com');
      expect(result).toEqual({
        protocol: 'http',
        host: 'test.com',
        endpoint: 'http://test.com',
      });
    });

    it('should handle https:// custom endpoint', () => {
      const result = getCustomEndpoint('https://test.com');
      expect(result).toEqual({
        protocol: 'https',
        host: 'test.com',
        endpoint: 'https://test.com',
      });
    });

    it('should handle custom endpoint without protocol', () => {
      const result = getCustomEndpoint('test.com');
      expect(result).toEqual({
        protocol: 'https',
        host: 'test.com',
        endpoint: 'https://test.com',
      });
    });

    it('should use http protocol in debug mode', () => {
      (isDebugMode as jest.Mock).mockReturnValue(true);

      const result = getCustomEndpoint(undefined);
      expect(result).toEqual({ protocol: 'http' });
    });
  });
});
