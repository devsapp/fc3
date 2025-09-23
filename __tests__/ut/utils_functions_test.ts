import { isAuto, isAutoVpcConfig, getTimeZone, sleep } from '../../src/utils/index';
import { computeLocalAuto } from '../../src/resources/fc/impl/utils';
import log from '../../src/logger';
log._set(console);

describe('Utils functions', () => {
  describe('isAuto', () => {
    it('should return true for "AUTO" string', () => {
      expect(isAuto('AUTO')).toBe(true);
      expect(isAuto('auto')).toBe(true);
      expect(isAuto('Auto')).toBe(true);
    });

    it('should return false for non-"AUTO" strings', () => {
      expect(isAuto('manual')).toBe(false);
      expect(isAuto('other')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isAuto(123)).toBe(false);
      expect(isAuto(null)).toBe(false);
      expect(isAuto(undefined)).toBe(false);
      expect(isAuto({})).toBe(false);
      expect(isAuto([])).toBe(false);
    });
  });

  describe('computeLocalAuto', () => {
    it('should compute auto resources correctly', () => {
      const local = {
        nasConfig: 'auto',
        vpcConfig: 'auto',
        logConfig: 'auto',
        ossMountConfig: 'auto',
        role: 'auto',
      };

      const result = computeLocalAuto(local);

      expect(result).toEqual({
        nasAuto: true,
        vpcAuto: true,
        slsAuto: true,
        roleAuto: true,
        ossAuto: true,
      });
    });

    it('should compute auto resources correctly when ossMountConfig is auto', () => {
      const local = {
        ossMountConfig: 'auto',
      };

      const result = computeLocalAuto(local);

      expect(result).toEqual({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: true,
      });
    });

    it('should compute auto resources correctly when ossMountConfig has mountPoints', () => {
      const local = {
        ossMountConfig: {
          mountPoints: [
            {
              mountDir: '/mnt/oss',
              bucketName: 'test-bucket',
              endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
              bucketPath: '/test-path',
              readOnly: false,
            },
          ],
        },
      };

      const result = computeLocalAuto(local);

      expect(result).toEqual({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: true,
        ossAuto: false,
      });
    });

    it('should compute auto resources correctly when ossMountConfig is not auto', () => {
      const local = {
        nasConfig: 'manual',
        vpcConfig: 'manual',
        logConfig: 'manual',
        ossMountConfig: 'manual',
        role: 'manual',
      };

      const result = computeLocalAuto(local);

      expect(result).toEqual({
        nasAuto: false,
        vpcAuto: false,
        slsAuto: false,
        roleAuto: false,
        ossAuto: false,
      });
    });
  });

  describe('isAutoVpcConfig', () => {
    it('should return true for "AUTO" string', () => {
      expect(isAutoVpcConfig('AUTO')).toBe(true);
      expect(isAutoVpcConfig('auto')).toBe(true);
    });

    it('should return true for object with AUTO vSwitchIds', () => {
      const config = {
        vpcId: 'vpc-123',
        vSwitchIds: 'auto',
      };
      expect(isAutoVpcConfig(config)).toBe(true);
    });

    it('should return true for object with AUTO securityGroupId', () => {
      const config = {
        vpcId: 'vpc-123',
        securityGroupId: 'auto',
      };
      expect(isAutoVpcConfig(config)).toBe(true);
    });

    it('should return false for object without vpcId', () => {
      const config = {
        vSwitchIds: 'auto',
      };
      expect(isAutoVpcConfig(config)).toBe(false);
    });

    it('should return false for non-auto configs', () => {
      const config = {
        vpcId: 'vpc-123',
        vSwitchIds: 'vsw-123',
      };
      expect(isAutoVpcConfig(config)).toBe(false);
    });
  });

  describe('getTimeZone', () => {
    it('should return a valid timezone string', () => {
      const tz = getTimeZone();
      expect(tz).toMatch(/^UTC[+-]\d+$/);
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(0.01); // 10ms
      const end = Date.now();
      // Allow for small timing variations (±1ms) due to system scheduling
      expect(end - start).toBeGreaterThanOrEqual(9);
    });
  });
});
