import { isAuto, getTimeZone, isAutoVpcConfig, removeNullValues } from '../../src/utils/index';
import log from '../../src/logger';
import _Logger from '@serverless-devs/logger';
const loggerInstance = new _Logger({
  traceId: 'traceId_12345789',
  logDir: '/tmp/.s',
  level: 'DEBUG',
});
const logger = loggerInstance.__generate('s_cli_unit_test');
log._set(logger);

describe('isAuto', () => {
  test('should return true if config is string "AUTO" or "auto"', () => {
    expect(isAuto('AUTO')).toBe(true);
    expect(isAuto('auto')).toBe(true);
  });

  test('should return false if config is not string "AUTO"', () => {
    expect(isAuto('Manual')).toBe(false);
    expect(isAuto(123)).toBe(false);
    expect(isAuto(null)).toBe(false);
    expect(isAuto(undefined)).toBe(false);
    expect(isAuto({})).toBe(false);
    expect(isAuto([])).toBe(false);
  });
});

describe('isAutoVpcConfig', () => {
  it('should return true if config is string "AUTO"', () => {
    const config = 'AUTO';
    expect(isAutoVpcConfig(config)).toBe(true);
    const config2 = 'auto';
    expect(isAutoVpcConfig(config2)).toBe(true);
  });

  it('should return false if config is string but not "AUTO"', () => {
    const config = 'notAuto';
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return true if config is an object with vpcId and vSwitchIds is "AUTO"', () => {
    const config = { vpcId: 'vpc-123', vSwitchIds: 'auto' };
    expect(isAutoVpcConfig(config)).toBe(true);
  });

  it('should return true if config is an object with vpcId and securityGroupId is "AUTO"', () => {
    const config = { vpcId: 'vpc-123', securityGroupId: 'auto' };
    expect(isAutoVpcConfig(config)).toBe(true);
  });

  it('should return false if config is an object with vpcId and vSwitchIds is not "AUTO"', () => {
    const config = { vpcId: 'vpc-123', vSwitchIds: 'notAuto' };
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return false if config is an object with vpcId and securityGroupId is not "AUTO"', () => {
    const config = { vpcId: 'vpc-123', securityGroupId: 'notAuto' };
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return false if config is an object without vpcId', () => {
    const config = { vSwitchIds: 'auto' };
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return false if config is an object without vSwitchIds', () => {
    const config = { vpcId: 'vpc-123' };
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return false if config is null', () => {
    const config = null;
    expect(isAutoVpcConfig(config)).toBe(false);
  });

  it('should return false if config is undefined', () => {
    const config = undefined;
    expect(isAutoVpcConfig(config)).toBe(false);
  });
});

test('getTimeZone', () => {
  const t = getTimeZone();
  console.log(t);
  expect(t === 'UTC+0' || t === 'UTC+8').toBe(true);
});

describe('removeNullValues', () => {
  // 测试用例1：空对象
  it('should not modify an empty object', () => {
    const input = {};
    removeNullValues(input);
    expect(input).toEqual({});
  });

  // 测试用例2：无null值的对象
  it('should not modify an object without null values', () => {
    const input = { a: 1, b: 2, c: 3 };
    removeNullValues(input);
    expect(input).toEqual({ a: 1, b: 2, c: 3 });
  });

  // 测试用例3：含有null值的对象
  it('should remove null values from an object', () => {
    const input = { a: 1, b: null, c: 3 };
    removeNullValues(input);
    expect(input).toEqual({ a: 1, c: 3 });
  });

  // 测试用例4：含有嵌套null值的对象
  it('should remove null values from an object with nested objects', () => {
    const input = { a: 1, b: { c: 3, d: null }, e: 5 };
    removeNullValues(input);
    expect(input).toEqual({ a: 1, b: { c: 3 }, e: 5 });
  });

  // 测试用例5：含有多个嵌套null值的对象
  it('should remove null values from an object with multiple nested objects', () => {
    const input = { a: 1, b: { c: null, d: 4 }, e: { f: 6, g: null } };
    removeNullValues(input);
    expect(input).toEqual({ a: 1, b: { d: 4 }, e: { f: 6 } });
  });
});
