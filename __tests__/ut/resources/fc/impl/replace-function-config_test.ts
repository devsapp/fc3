import replaceFunctionConfig from '../../../../../src/resources/fc/impl/replace-function-config';
import * as utils from '../../../../../src/resources/fc/impl/utils';
import logger from '../../../../../src/logger';
import _ from 'lodash';

// Mock external dependencies
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../src/resources/fc/impl/utils');
jest.mock('lodash');

describe('replace-function-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock lodash functions
    (_.cloneDeep as any) = jest.fn((obj) => {
      if (obj === undefined) return undefined;
      return JSON.parse(JSON.stringify(obj));
    });
    (_.isEmpty as any) = jest.fn((obj) => {
      if (obj === undefined || obj === null) return true;
      if (typeof obj === 'object' && Object.keys(obj).length === 0) return true;
      if (Array.isArray(obj) && obj.length === 0) return true;
      return false;
    });
    (_.set as any) = jest.fn((obj, path, value) => {
      const keys = path.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return obj;
    });
    (_.unset as any) = jest.fn((obj, path) => {
      const keys = path.split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) return true;
        current = current[keys[i]];
      }
      delete current[keys[keys.length - 1]];
      return true;
    });
    (_.get as any) = jest.fn((obj, path, defaultValue) => {
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (current === undefined || current === null) return defaultValue;
        current = current[key];
      }
      return current !== undefined ? current : defaultValue;
    });
    (_.isString as any) = jest.fn((obj) => typeof obj === 'string');
    (_.toUpper as any) = jest.fn((str) => str.toUpperCase());
    (_.isObject as any) = jest.fn(
      (obj) => typeof obj === 'object' && obj !== null && !Array.isArray(obj),
    );
  });

  describe('replaceFunctionConfig', () => {
    it('should handle empty remote config', () => {
      const local = { runtime: 'nodejs18' };
      const remote = undefined;

      const result = replaceFunctionConfig(local, remote);

      expect(result).toEqual({ local, remote });
      expect(logger.debug).toHaveBeenCalledWith(
        `Pre init function local config: ${JSON.stringify(local)}`,
      );
    });

    it('should handle custom container runtime', () => {
      const local = { runtime: 'custom-container' };
      const remote = { customContainerConfig: { resolvedImageUri: 'test-uri' } };

      (utils.isCustomContainerRuntime as jest.Mock).mockReturnValue(true);
      (utils.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (utils.getRemoteResourceConfig as jest.Mock).mockReturnValue({
        remoteNasConfig: undefined,
        remoteVpcConfig: undefined,
        remoteLogConfig: undefined,
        remoteRole: undefined,
        remoteOssConfig: undefined,
      });
      (utils.computeLocalAuto as jest.Mock).mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });

      const result = replaceFunctionConfig(local, remote);
      expect(result).toBeDefined();

      expect(result.local).toEqual({
        runtime: 'custom-container',
        handler: 'handler',
        role: '',
      });
      expect(_.unset).toHaveBeenCalledWith(expect.any(Object), 'code');
      expect(_.unset).toHaveBeenCalledWith(
        expect.any(Object),
        'customContainerConfig.accelerationInfo',
      );
    });

    it('should handle custom runtime with handler', () => {
      const local = { runtime: 'custom', handler: undefined };
      const remote = { handler: 'index.handler' };

      (utils.isCustomContainerRuntime as jest.Mock).mockReturnValue(false);
      (utils.isCustomRuntime as jest.Mock).mockReturnValue(true);
      (utils.getRemoteResourceConfig as jest.Mock).mockReturnValue({
        remoteNasConfig: undefined,
        remoteVpcConfig: undefined,
        remoteLogConfig: undefined,
        remoteRole: undefined,
        remoteOssConfig: undefined,
      });
      (utils.computeLocalAuto as jest.Mock).mockReturnValue({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });

      const result = replaceFunctionConfig(local, remote);
      expect(result).toBeDefined();

      expect(result.local.handler).toBe('index.handler');
    });

    it('should handle auto NAS config', () => {
      const local = { nasConfig: 'auto' };
      const remote = {
        nasConfig: { mountPoints: [{ serverAddr: 'test-server', mountDir: '/mnt/test' }] },
      };

      (utils.isCustomContainerRuntime as jest.Mock).mockReturnValue(false);
      (utils.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (utils.getRemoteResourceConfig as jest.Mock).mockReturnValue({
        remoteNasConfig: remote.nasConfig,
        remoteVpcConfig: undefined,
        remoteLogConfig: undefined,
        remoteRole: undefined,
        remoteOssConfig: undefined,
      });
      (utils.computeLocalAuto as jest.Mock).mockReturnValue({
        nasAuto: true,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });
      (_.isEmpty as any).mockImplementation((obj) => {
        if (obj === undefined || obj === null) return true;
        if (Array.isArray(obj) && obj.length === 0) return true;
        if (typeof obj === 'object' && Object.keys(obj).length === 0) return true;
        return false;
      });

      const result = replaceFunctionConfig(local, remote);
      expect(result).toBeDefined();
      expect(result.local).toEqual({
        nasConfig: remote.nasConfig,
        role: '',
      });

      expect(_.set).toHaveBeenCalledWith(expect.any(Object), 'nasConfig', remote.nasConfig);
      expect(_.set).toHaveBeenCalledWith(expect.any(Object), 'role', '');
    });

    it('should handle auto VPC config with string value', () => {
      const local = { vpcConfig: 'AUTO' };
      const remote = {
        vpcConfig: { vpcId: 'test-vpc', vSwitchIds: ['vsw-123'], securityGroupId: 'sg-123' },
      };

      (utils.isCustomContainerRuntime as jest.Mock).mockReturnValue(false);
      (utils.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (utils.getRemoteResourceConfig as jest.Mock).mockReturnValue({
        remoteNasConfig: undefined,
        remoteVpcConfig: remote.vpcConfig,
        remoteLogConfig: undefined,
        remoteRole: undefined,
        remoteOssConfig: undefined,
      });
      (utils.computeLocalAuto as jest.Mock).mockReturnValue({
        nasAuto: false,
        vpcAuto: true,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });
      (_.isString as any).mockImplementation((obj) => typeof obj === 'string');
      (_.toUpper as jest.Mock).mockImplementation((str) => str.toUpperCase());

      const result = replaceFunctionConfig(local, remote);
      expect(result).toBeDefined();
      expect(result.local).toEqual({
        vpcConfig: remote.vpcConfig,
        role: '',
      });

      expect(_.set).toHaveBeenCalledWith(expect.any(Object), 'vpcConfig', remote.vpcConfig);
      expect(_.set).toHaveBeenCalledWith(expect.any(Object), 'role', '');
    });
  });
});
