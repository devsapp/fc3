import {
  isAuto,
  getTimeZone,
  isAutoVpcConfig,
  removeNullValues,
  getFileSize,
} from '../../src/utils/index';
import * as fs from 'fs';
import log from '../../src/logger';
log._set(console);

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

// Mock fs module
jest.mock('fs', () => ({
  statSync: jest.fn(),
}));

describe('getFileSize', () => {
  it('returns size in GB when size is greater than 1 GB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 1073741824; // 1 GB in bytes
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(1);
    expect(fs.statSync).toHaveBeenCalledWith(filePath);
  });

  it('returns size in MB when size is greater than 1 MB but less than 1 GB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 1048576; // 1 MB in bytes
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(1);
    expect(fs.statSync).toHaveBeenCalledWith(filePath);
  });

  it('returns size in KB when size is greater than 1 KB but less than 1 MB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 1024; // 1 KB in bytes
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(1);
    expect(fs.statSync).toHaveBeenCalledWith(filePath);
  });

  it('returns size in bytes when size is less than 1 KB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 512; // Less than 1 KB
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(0);
    expect(fs.statSync).toHaveBeenCalledWith(filePath);
  });

  it('throws error when file does not exist', () => {
    const filePath = 'path-to-file';
    (fs.statSync as jest.Mock).mockImplementation(() => {
      throw new Error('File not found');
    });

    expect(() => getFileSize(filePath)).toThrow('File not found');
  });
});
