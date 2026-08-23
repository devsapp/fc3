import {
  MAX_DEFAULT_RENDER_LINES,
  estimateRenderLines,
  isAuto,
  isAutoVpcConfig,
  isDefaultRenderOutput,
  sleep,
} from '../../../src/utils/index';
import { computeLocalAuto } from '../../../src/resources/fc/impl/utils';
import log from '../../../src/logger';
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

  describe('isDefaultRenderOutput', () => {
    it('should return true when no output format flag is present', () => {
      expect(isDefaultRenderOutput(['cli', 'fc3', 'list', '--region', 'cn-hangzhou'])).toBe(true);
    });

    it('should return false for -o/--output-format/--output/--output-file', () => {
      expect(isDefaultRenderOutput(['list', '-o', 'json'])).toBe(false);
      expect(isDefaultRenderOutput(['list', '--output-format', 'yaml'])).toBe(false);
      expect(isDefaultRenderOutput(['list', '--output', 'raw'])).toBe(false);
      expect(isDefaultRenderOutput(['list', '--output-file', './out.json'])).toBe(false);
    });

    it('should recognize flags written as --flag=value', () => {
      expect(isDefaultRenderOutput(['list', '--output-format=json'])).toBe(false);
    });

    it('should not confuse a value that looks like a flag name', () => {
      expect(isDefaultRenderOutput(['list', '--prefix', 'output'])).toBe(true);
    });
  });

  describe('estimateRenderLines', () => {
    it('should count one line per scalar field', () => {
      expect(estimateRenderLines({ a: 1, b: 'x', c: null })).toBe(3);
    });

    it('should count nested objects and arrays', () => {
      // functionName + nasConfig + nasConfig.groupId + nasConfig.mountPoints
      // + 2 mount points, each with a separator line
      expect(
        estimateRenderLines({
          functionName: 'f',
          nasConfig: { groupId: 1, mountPoints: [{ mountDir: '/mnt' }, { mountDir: '/data' }] },
        }),
      ).toBe(8);
    });

    it('should count scalars in an array as one line each', () => {
      expect(estimateRenderLines(['a', 'b', 'c'])).toBe(3);
    });

    it('should count the separator line prettyjson adds per object in an array', () => {
      // prettyjson 对 [{ a: 1 }, { a: 2 }] 输出 4 行，每个元素的字段 1 行 + 分隔 1 行
      expect(estimateRenderLines([{ a: 1 }, { a: 2 }])).toBe(4);
      expect(estimateRenderLines([[1, 2, 3]])).toBe(4);
    });

    it('should exceed the threshold for a listing that breaks the default renderer', () => {
      const functions = Array.from({ length: 20000 }, (_v, i) => ({
        functionName: `f-${i}`,
        runtime: 'nodejs18',
        handler: 'index.handler',
      }));
      expect(estimateRenderLines({ functions })).toBeGreaterThan(MAX_DEFAULT_RENDER_LINES);
    });

    it('should stay under the threshold for a normal listing', () => {
      const functions = Array.from({ length: 100 }, (_v, i) => ({ functionName: `f-${i}` }));
      expect(estimateRenderLines({ functions })).toBeLessThan(MAX_DEFAULT_RENDER_LINES);
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
