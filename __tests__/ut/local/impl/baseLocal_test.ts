import { BaseLocal } from '../../../../src/subCommands/local/impl/baseLocal';
import { IInputs, IProps } from '../../../../src/interface';
import { ICredentials } from '@serverless-devs/component-interface';
import logger from '../../../../src/logger';
import _ from 'lodash';
import path from 'path';
import * as fs from 'fs-extra';
import { v4 as uuidV4 } from 'uuid';
import tmpDir from 'temp-dir';

// Mock external dependencies
jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../src/utils');
jest.mock('../../../../src/resources/fc');
jest.mock('lodash');
jest.mock('path');
jest.mock('fs-extra');
jest.mock('uuid');
jest.mock('temp-dir');

describe('BaseLocal', () => {
  let mockInputs: IInputs;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock uuidV4 to return a fixed value
    (uuidV4 as jest.Mock).mockReturnValue('test-uuid');

    // Mock tempDir
    (tmpDir as any) = '/tmp';

    // Mock inputs
    mockInputs = {
      baseDir: '/test/base/dir',
      props: {
        runtime: 'nodejs18',
        region: 'cn-hangzhou',
        functionName: 'test-function',
        code: './code',
        timeout: 30,
        memorySize: 128,
      } as IProps,
      args: '',
      getCredential: jest.fn().mockResolvedValue({
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
      } as ICredentials),
      credential: {},
      userAgent: 'test-user-agent',
    } as any;

    // Mock lodash functions
    (_.get as jest.Mock).mockImplementation((obj, path, defaultValue) => {
      if (path === 'props.region') return 'cn-hangzhou';
      return defaultValue;
    });
    // _.isEmpty should return true for empty objects and false for non-empty objects
    (_.isEmpty as unknown as jest.Mock).mockImplementation((value) => {
      if (value && typeof value === 'object') {
        return Object.keys(value).length === 0;
      }
      return !value;
    });
    (_.endsWith as jest.Mock).mockImplementation((str, suffix) => str.endsWith(suffix));

    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));

    // Mock fs functions
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  describe('constructor', () => {
    it('should create BaseLocal instance with correct properties', () => {
      const instance = new BaseLocal(mockInputs);

      expect(instance).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith('Local baseDir is: /test/base/dir');
    });

    it('should use process.cwd() when baseDir is not provided', () => {
      const inputsWithoutBaseDir = { ...mockInputs, baseDir: undefined };
      const instance = new BaseLocal(inputsWithoutBaseDir);

      expect(instance).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(`Local baseDir is: ${process.cwd()}`);
    });
  });

  describe('getRuntime', () => {
    it('should return runtime from props', () => {
      const instance = new BaseLocal(mockInputs);
      const runtime = instance.getRuntime();

      expect(runtime).toBe('nodejs18');
    });
  });

  describe('getFunctionName', () => {
    it('should return functionName from props', () => {
      const instance = new BaseLocal(mockInputs);
      const functionName = instance.getFunctionName();

      expect(functionName).toBe('test-function');
    });
  });

  describe('getTimeout', () => {
    it('should return timeout from props', () => {
      const instance = new BaseLocal(mockInputs);
      const timeout = instance.getTimeout();

      expect(timeout).toBe(30);
    });
  });

  describe('getMemorySize', () => {
    it('should return memorySize from props', () => {
      const instance = new BaseLocal(mockInputs);
      const memorySize = instance.getMemorySize();

      expect(memorySize).toBe(128);
    });

    it('should return default memorySize when not provided', () => {
      const inputsWithoutMemorySize = JSON.parse(JSON.stringify(mockInputs));
      delete inputsWithoutMemorySize.props.memorySize;

      const instance = new BaseLocal(inputsWithoutMemorySize);
      const memorySize = instance.getMemorySize();

      expect(memorySize).toBe(128);
    });
  });

  describe('getRegion', () => {
    it('should return region from props', () => {
      const instance = new BaseLocal(mockInputs);
      const region = instance.getRegion();

      expect(region).toBe('cn-hangzhou');
    });
  });

  describe('getContainerName', () => {
    it('should return container name', () => {
      const instance = new BaseLocal(mockInputs);
      const containerName = instance.getContainerName();

      expect(containerName).toBe('test-uuid');
    });
  });

  describe('getCredentials', () => {
    it('should return credentials from inputs', async () => {
      const instance = new BaseLocal(mockInputs);
      const credentials = await instance.getCredentials();

      expect(credentials).toEqual({
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
      });
      expect(mockInputs.getCredential).toHaveBeenCalled();
    });

    it('should not call getCredential if credentials already exist', async () => {
      const inputsWithCredentials = {
        ...mockInputs,
        credential: {
          AccountID: 'existing-account-id',
          AccessKeyID: 'existing-access-key-id',
          AccessKeySecret: 'existing-access-key-secret',
          SecurityToken: 'existing-security-token',
        },
      };

      const instance = new BaseLocal(inputsWithCredentials);
      const credentials = await instance.getCredentials();

      expect(credentials).toEqual({
        AccountID: 'existing-account-id',
        AccessKeyID: 'existing-access-key-id',
        AccessKeySecret: 'existing-access-key-secret',
        SecurityToken: 'existing-security-token',
      });
      expect(inputsWithCredentials.getCredential).not.toHaveBeenCalled();
    });
  });

  describe('isCustomContainerRuntime', () => {
    it('should return true for custom-container runtime', () => {
      const inputsWithCustomContainer = JSON.parse(JSON.stringify(mockInputs));
      inputsWithCustomContainer.props.runtime = 'custom-container';

      const instance = new BaseLocal(inputsWithCustomContainer);
      const result = instance.isCustomContainerRuntime();

      expect(result).toBe(true);
    });

    it('should return false for non custom-container runtime', () => {
      const instance = new BaseLocal(mockInputs);
      const result = instance.isCustomContainerRuntime();

      expect(result).toBe(false);
    });
  });

  describe('checkCodeUri', () => {
    it('should return true when codeUri is valid', () => {
      const instance = new BaseLocal(mockInputs);
      const result = instance.checkCodeUri();

      expect(result).toBe(true);
    });

    it('should return false when code is not provided', () => {
      const inputsWithoutCode = JSON.parse(JSON.stringify(mockInputs));
      delete inputsWithoutCode.props.code;

      const instance = new BaseLocal(inputsWithoutCode);
      const result = instance.checkCodeUri();

      expect(result).toBe(false);
    });

    it('should return false when src is not configured', () => {
      const inputsWithEmptyCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithEmptyCode.props.code = { src: '' } as any;

      const instance = new BaseLocal(inputsWithEmptyCode);
      const result = instance.checkCodeUri();

      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('No Src configured');
    });
  });

  describe('canSupportDebug', () => {
    it('should return true for supported runtime', () => {
      const instance = new BaseLocal(mockInputs);
      const result = instance.canSupportDebug('nodejs18');

      expect(result).toBe(true);
    });

    it('should return false for unsupported runtime', () => {
      const instance = new BaseLocal(mockInputs);
      const result = instance.canSupportDebug('go1');

      expect(result).toBe(false);
    });
  });
});
