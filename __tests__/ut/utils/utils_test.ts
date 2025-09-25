import {
  isAuto,
  getTimeZone,
  isAutoVpcConfig,
  removeNullValues,
  getFileSize,
  promptForConfirmOrDetails,
  checkDockerInstalled,
  checkDockerDaemonRunning,
  checkDockerIsOK,
  isAppCenter,
  isYunXiao,
  tableShow,
  sleep,
  verify,
} from '../../../src/utils/index';
import { IProps } from '../../../src/interface';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import log from '../../../src/logger';
import { execSync } from 'child_process';
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

jest.mock('fs', () => ({
  statSync: jest.fn(),
}));

describe('getFileSize', () => {
  it('returns size in GB when size is greater than 1 GB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 1610612736; // 1.5 GB in bytes
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(1.5);
    expect(fs.statSync).toHaveBeenCalledWith(filePath);
  });

  it('returns size in MB when size is greater than 1 MB but less than 1 GB', () => {
    const filePath = 'path-to-file';
    const fileSizeInBytes = 1258291.2; // 1.2 MB in bytes
    (fs.statSync as jest.Mock).mockReturnValue({ size: fileSizeInBytes });

    const size = getFileSize(filePath);

    expect(size).toBe(1.2);
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

    expect(size).toBe(0.5);
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

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));

describe('promptForConfirmOrDetails', () => {
  it('should return true when user selects "yes"', async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ prompt: 'yes' });

    const result = await promptForConfirmOrDetails('Confirm?');

    expect(result).toBe(true);
    expect(inquirer.prompt).toHaveBeenCalledTimes(1);
  });

  it('should return false when user selects "no"', async () => {
    (inquirer.prompt as jest.Mock).mockResolvedValue({ prompt: 'no' });

    const result = await promptForConfirmOrDetails('Confirm?');

    expect(result).toBe(false);
    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
  });
});

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
}));

describe('checkDockerInstalled', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  it('return true if Docker is install', () => {
    (execSync as jest.Mock).mockImplementation(() => 'Docker version 20.10.8, build 3967b0d');
    const spyOnDebug = jest.spyOn(log, 'debug');

    const result = checkDockerInstalled();

    expect(result).toBe(true);
    expect(spyOnDebug).toHaveBeenCalledWith(
      'Docker is installed:',
      'Docker version 20.10.8, build 3967b0d',
    );
  });

  it('returns false if Docker is not installed', () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('Command failed: docker --version');
    });
    const spyOnError = jest.spyOn(log, 'error');

    const result = checkDockerInstalled();

    expect(result).toBe(false);
    expect(spyOnError).toHaveBeenCalledWith(
      'Docker is not installed, please refer "https://docs.docker.com/engine/install". if use podman, please refer "https://help.aliyun.com/document_detail/2513750.html?spm=a2c4g.2513735.0.i0#e72aae479a5gf"',
    );
  });
});

describe('checkDockerDaemonRunning', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  it('return true if Docker daemon is running', () => {
    (execSync as jest.Mock).mockImplementation(() => {});
    const spyOnDebug = jest.spyOn(log, 'debug');

    const result = checkDockerDaemonRunning();

    expect(result).toBe(true);
    expect(spyOnDebug).toHaveBeenCalledWith('Docker daemon is running.');
  });

  it('return false if Docker daemon is not running', () => {
    (execSync as jest.Mock).mockImplementation(() => {
      throw new Error('Docker daemon is not running.');
    });
    const spyOnError = jest.spyOn(log, 'error');

    const result = checkDockerDaemonRunning();

    expect(result).toBe(false);
    expect(spyOnError).toHaveBeenCalledWith('Docker daemon is not running.');
  });
});

describe('checkDockerIsOK', () => {
  const checkDockerInstalled = jest.fn();
  const checkDockerDaemonRunning = jest.fn();

  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  it('should throw an error if Docker is not installed', () => {
    checkDockerInstalled.mockReturnValue(false);
    checkDockerDaemonRunning.mockReturnValue(true);

    const spyOnError = jest.spyOn(log, 'error');

    expect(() => checkDockerIsOK()).toThrow('Docker is not OK');
    expect(spyOnError).toHaveBeenCalledWith(
      'Docker is not installed, please refer "https://docs.docker.com/engine/install". if use podman, please refer "https://help.aliyun.com/document_detail/2513750.html?spm=a2c4g.2513735.0.i0#e72aae479a5gf"',
    );
  });

  it('should throw an error if Docker daemon is not running', () => {
    checkDockerInstalled.mockReturnValue(true);
    checkDockerDaemonRunning.mockReturnValue(false);

    expect(() => checkDockerIsOK()).toThrow('Docker is not OK');
  });
});

describe('isAppCenter', () => {
  it('return true if BUILD_IMAGE_ENV is fc-backend', () => {
    process.env.BUILD_IMAGE_ENV = 'fc-backend';
    expect(isAppCenter()).toBe(true);
  });

  it('return false if BUILD_IMAGE_ENV is not fc-backend', () => {
    delete process.env.BUILD_IMAGE_ENV;
    expect(isAppCenter()).toBe(false);
  });
});

describe('isYunXiao', () => {
  it('return true if ENGINE_PIPELINE_PORTAL_URL is https://flow.aliyun.com', () => {
    process.env.ENGINE_PIPELINE_PORTAL_URL = 'https://flow.aliyun.com';
    expect(isYunXiao()).toBe(true);
  });

  it('return false if ENGINE_PIPELINE_PORTAL_URL is not https://flow.aliyun.com', () => {
    delete process.env.ENGINE_PIPELINE_PORTAL_URL;
    expect(isYunXiao()).toBe(false);
  });
});

describe('tableShow', () => {
  const logMock = jest.spyOn(console, 'log');

  beforeEach(() => {
    logMock.mockClear();
  });

  it('should render table with given data and showKey', () => {
    const mockData = [
      { name: 'John', age: 25, city: 'New York' },
      { name: 'Lisa', age: 30, city: 'London' },
      { name: 'David', age: 35, city: 'Paris' },
    ];
    const mockShowKey = ['name', 'age', 'city'];

    tableShow(mockData, mockShowKey);

    expect(logMock).toHaveBeenCalled();

    const logCalls = logMock.mock.calls;

    expect(logCalls.length).toBe(1);
  });
});

describe('sleep', () => {
  it('should sleep for the specified number of seconds', async () => {
    const start = Date.now();
    await sleep(1);
    const end = Date.now();

    // Allow for small timing variations
    expect(end - start).toBeGreaterThanOrEqual(995);
  });

  it('should sleep for a fraction of a second when given a decimal value', async () => {
    const start = Date.now();
    await sleep(0.5);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(499);
    expect(end - start).toBeLessThan(1000);
  });

  it('should sleep for at least 0 milliseconds when given 0 as the input', async () => {
    const start = Date.now();
    await sleep(0);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(0);
  });
});

jest.mock(
  'SCHEMA_FILE_PATH',
  () => ({
    validateSchema: jest.fn(),
  }),
  { virtual: true },
);

describe('verify', () => {
  it('should validate valid props without errors', () => {
    const props: IProps = {
      region: 'cn-hangzhou',
      functionName: 'your-function-name',
      runtime: 'nodejs18',
      handler: 'index.handler',
      code: '/code',
    };

    verify(props);
  });

  it('should validate invalid props with errors', () => {
    const props: IProps = {
      region: 'cn-hangzhou',
      functionName: 'your-function-name',
      runtime: 'nodejs18',
      handler: 'index.handler',
      code: '/code',
      memorySize: 129,
    };
    verify(props);
  });
});
