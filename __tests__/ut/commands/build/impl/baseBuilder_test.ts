import { Builder } from '../../../../../src/subCommands/build/impl/baseBuilder';
import { IInputs, IProps } from '../../../../../src/interface';
import { ICredentials } from '@serverless-devs/component-interface';
import * as path from 'path';
import * as fs from 'fs';
import _ from 'lodash';
import logger from '../../../../../src/logger';
import FC from '../../../../../src/resources/fc';
import { runCommand } from '../../../../../src/utils';

// Set environment variable for testing
process.env.FC_DOCKER_IMAGE_URL = 'custom-fc-image:latest';

// Mock external dependencies
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/resources/acr');
jest.mock('../../../../../src/utils');
jest.mock('../../../../../src/default/image', () => ({
  fcDockerVersion: '3.1.0',
  fcDockerVersionRegistry: 'registry.cn-beijing.aliyuncs.com',
  fcDockerNameSpace: 'aliyunfc',
  fcDockerUseImage: 'custom-fc-image:latest',
  buildPythonLocalPath: 'python',
}));
jest.mock('path');
jest.mock('fs');

describe('Builder', () => {
  let mockInputs: IInputs;
  let builder: TestBuilder;

  class TestBuilder extends Builder {
    async runBuild(): Promise<any> {
      return Promise.resolve();
    }
  }

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock inputs
    mockInputs = {
      baseDir: '/test/base/dir',
      props: {
        runtime: 'nodejs18',
        region: 'cn-hangzhou',
        functionName: 'test-function',
        code: './code',
        environmentVariables: {
          TEST_VAR: 'test-value',
        },
      } as IProps,
      args: '',
      getCredential: jest.fn().mockResolvedValue({
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
      } as ICredentials),
    } as any;

    builder = new TestBuilder(mockInputs);

    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));
    (path.basename as jest.Mock).mockImplementation((p) => p.split('/').pop());

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Mock runCommand
    (runCommand as any).mockResolvedValue(undefined);

    // Mock lodash functions
    jest.spyOn(_, 'get').mockImplementation((obj, path, defaultValue) => {
      if (path === 'code') return './code';
      if (path === 'environmentVariables') return { TEST_VAR: 'test-value' };
      return defaultValue;
    });
    jest.spyOn(_, 'isEmpty').mockReturnValue(false);
    jest.spyOn(_, 'endsWith').mockImplementation((str, suffix) => {
      if (typeof str === 'string') {
        return str.endsWith(suffix);
      }
      return false;
    });
  });

  describe('constructor', () => {
    it('should create Builder instance with baseDir from inputs', () => {
      expect(builder).toBeDefined();
      expect((builder as any).baseDir).toBe('/test/base/dir');
    });

    it('should use process.cwd() when baseDir is not provided', () => {
      const inputsWithoutBaseDir = { ...mockInputs, baseDir: undefined };
      const builderWithoutBaseDir = new TestBuilder(inputsWithoutBaseDir);
      expect((builderWithoutBaseDir as any).baseDir).toBe(process.cwd());
    });
  });

  describe('getProps', () => {
    it('should return props from inputs', () => {
      const props = builder.getProps();
      expect(props).toEqual(mockInputs.props);
    });
  });

  describe('getRuntime', () => {
    it('should return runtime from props', () => {
      const runtime = builder.getRuntime();
      expect(runtime).toBe('nodejs18');
    });
  });

  describe('getRegion', () => {
    it('should return region from props', () => {
      const region = builder.getRegion();
      expect(region).toBe('cn-hangzhou');
    });
  });

  describe('getFunctionName', () => {
    it('should return functionName from props', () => {
      const functionName = builder.getFunctionName();
      expect(functionName).toBe('test-function');
    });
  });

  describe('getCredentials', () => {
    it('should return credentials from inputs', async () => {
      const credentials = await builder.getCredentials();
      expect(credentials).toEqual({
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
      });
      expect(mockInputs.getCredential).toHaveBeenCalled();
    });
  });

  describe('getEnv', () => {
    it('should return environmentVariables from props', () => {
      const env = builder.getEnv();
      expect(env).toEqual({ TEST_VAR: 'test-value' });
    });

    it('should return empty object when environmentVariables is not set', () => {
      const inputsWithoutEnv = JSON.parse(JSON.stringify(mockInputs));
      delete inputsWithoutEnv.props.environmentVariables;
      const builderWithoutEnv = new TestBuilder(inputsWithoutEnv);
      const env = builderWithoutEnv.getEnv();
      expect(env).toEqual({});
    });
  });

  describe('getCodeUri', () => {
    it('should return resolved codeUri when code is valid', () => {
      (builder as any).checkCodeUri = jest.fn().mockReturnValue(true);
      const codeUri = builder.getCodeUri();
      expect(codeUri).toBe('/test/base/dir/./code');
    });

    it('should return empty string when checkCodeUri returns false', () => {
      (builder as any).checkCodeUri = jest.fn().mockReturnValue(false);
      const codeUri = builder.getCodeUri();
      expect(codeUri).toBe('');
    });

    it('should return absolute path when src is absolute', () => {
      const inputsWithAbsoluteCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithAbsoluteCode.props.code = '/absolute/path/code';
      const builderWithAbsolute = new TestBuilder(inputsWithAbsoluteCode);
      // Mock lodash.get to return the absolute path
      (_.get as jest.Mock).mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return '/absolute/path/code';
        return defaultValue;
      });
      // Mock checkCodeUri to return true for this test
      (builderWithAbsolute as any).checkCodeUri = jest.fn().mockReturnValue(true);
      const codeUri = builderWithAbsolute.getCodeUri();
      expect(codeUri).toBe('/absolute/path/code');
    });
  });

  describe('checkCodeUri', () => {
    it('should return false when code is not available', () => {
      const inputsWithoutCode = JSON.parse(JSON.stringify(mockInputs));
      delete inputsWithoutCode.props.code;
      const builderWithoutCode = new TestBuilder(inputsWithoutCode);
      // Mock lodash.get to return undefined when code is not available
      (_.get as jest.Mock).mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return undefined;
        return defaultValue;
      });
      const result = builderWithoutCode.checkCodeUri();
      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Code config is not available');
    });

    it('should return false when src is not configured', () => {
      const inputsWithEmptyCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithEmptyCode.props.code = { src: '' } as any;
      const builderWithoutSrc = new TestBuilder(inputsWithEmptyCode);
      // Mock lodash.get to return the code object
      (_.get as jest.Mock).mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return { src: '' };
        return defaultValue;
      });
      const result = builderWithoutSrc.checkCodeUri();
      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('No Src configured, skip building.');
    });

    it('should return false when src is a zip file', () => {
      const inputsWithZipCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithZipCode.props.code = './function.zip';
      const builderWithZip = new TestBuilder(inputsWithZipCode);
      // Mock lodash.get to return the zip file path
      jest.spyOn(_, 'get').mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return './function.zip';
        return defaultValue;
      });
      const result = builderWithZip.checkCodeUri();
      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Artifact configured, skip building.');
    });

    it('should return false when src is a jar file', () => {
      const inputsWithJarCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithJarCode.props.code = './function.jar';
      const builderWithJar = new TestBuilder(inputsWithJarCode);
      // Mock lodash.get to return the jar file path
      jest.spyOn(_, 'get').mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return './function.jar';
        return defaultValue;
      });
      const result = builderWithJar.checkCodeUri();
      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Artifact configured, skip building.');
    });

    it('should return false when src is a war file', () => {
      const inputsWithWarCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithWarCode.props.code = './function.war';
      const builderWithWar = new TestBuilder(inputsWithWarCode);
      // Mock lodash.get to return the war file path
      jest.spyOn(_, 'get').mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return './function.war';
        return defaultValue;
      });
      const result = builderWithWar.checkCodeUri();
      expect(result).toBe(false);
      expect(logger.info).toHaveBeenCalledWith('Artifact configured, skip building.');
    });

    it('should return true when src is a valid directory', () => {
      const inputsWithValidCode = JSON.parse(JSON.stringify(mockInputs));
      inputsWithValidCode.props.code = './code';
      const builderWithValidCode = new TestBuilder(inputsWithValidCode);
      // Mock lodash.get to return the code path
      jest.spyOn(_, 'get').mockImplementationOnce((obj, path, defaultValue) => {
        if (path === 'code') return './code';
        return defaultValue;
      });
      const result = builderWithValidCode.checkCodeUri();
      expect(result).toBe(true);
    });
  });

  describe('getRuntimeBuildImage', () => {
    it('should return custom container image when runtime is custom container', async () => {
      const inputsWithCustomContainer = JSON.parse(JSON.stringify(mockInputs));
      inputsWithCustomContainer.props.runtime = 'custom-container';
      inputsWithCustomContainer.props.customContainerConfig = { image: 'custom-image:latest' };
      const builderWithCustomContainer = new TestBuilder(inputsWithCustomContainer);

      (FC.isCustomContainerRuntime as jest.Mock).mockReturnValue(true);

      const image = await builderWithCustomContainer.getRuntimeBuildImage();
      expect(image).toBe('custom-image:latest');
      expect(logger.debug).toHaveBeenCalledWith(
        'use fc docker CustomContainer image: custom-image:latest',
      );
    });

    it('should throw error when image is not set in custom-container runtime', async () => {
      const inputsWithCustomContainer = JSON.parse(JSON.stringify(mockInputs));
      inputsWithCustomContainer.props.runtime = 'custom-container';
      inputsWithCustomContainer.props.customContainerConfig = { image: '' };
      const builderWithCustomContainer = new TestBuilder(inputsWithCustomContainer);

      (FC.isCustomContainerRuntime as jest.Mock).mockReturnValue(true);
      (_.isEmpty as any).mockReturnValue(true);

      await expect(builderWithCustomContainer.getRuntimeBuildImage()).rejects.toThrow(
        'image must be set in custom-container runtime',
      );
    });

    it('should return custom image when fcDockerUseImage is set', async () => {
      // Create a new builder instance
      const builderWithCustomImage = new TestBuilder(mockInputs);
      (FC.isCustomContainerRuntime as jest.Mock).mockReturnValue(false);
      // Mock the environment variable to ensure it's set
      process.env.FC_DOCKER_IMAGE_URL = 'custom-fc-image:latest';

      const image = await builderWithCustomImage.getRuntimeBuildImage();
      expect(image).toBe('custom-fc-image:latest');
      expect(logger.debug).toHaveBeenCalledWith(
        'use fc docker custom image: custom-fc-image:latest',
      );
    });
  });

  describe('beforeBuild', () => {
    it('should return false when codeUri is invalid', () => {
      (builder as any).checkCodeUri = jest.fn().mockReturnValue(false);
      const result = builder.beforeBuild();
      expect(result).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith('beforeBuild ...');
      expect(logger.debug).toHaveBeenCalledWith('checkCodeUri = false');
    });

    it('should return true when codeUri is valid', () => {
      (builder as any).checkCodeUri = jest.fn().mockReturnValue(true);
      (builder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      const result = builder.beforeBuild();
      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('beforeBuild ...');
      expect(logger.debug).toHaveBeenCalledWith('checkCodeUri = true');
      expect(logger.debug).toHaveBeenCalledWith('codeUri = /test/code/uri');
    });
  });

  describe('afterBuild', () => {
    it('should log debug message', () => {
      builder.afterBuild();
      expect(logger.debug).toHaveBeenCalledWith('afterBuild ...');
    });
  });

  describe('build', () => {
    it('should not call runBuild when beforeBuild returns false', async () => {
      (builder as any).beforeBuild = jest.fn().mockReturnValue(false);
      const runBuildSpy = jest.spyOn(builder, 'runBuild');

      await builder.build();
      expect(runBuildSpy).not.toHaveBeenCalled();
    });

    it('should call runBuild and afterBuild when beforeBuild returns true', async () => {
      (builder as any).beforeBuild = jest.fn().mockReturnValue(true);
      const runBuildSpy = jest.spyOn(builder, 'runBuild').mockResolvedValue(undefined);
      const afterBuildSpy = jest.spyOn(builder, 'afterBuild');

      await builder.build();
      expect(runBuildSpy).toHaveBeenCalled();
      expect(afterBuildSpy).toHaveBeenCalled();
    });
  });

  describe('existManifest', () => {
    it('should return false when file does not exist', () => {
      (builder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const result = builder.existManifest('non-existent-file.txt');
      expect(result).toBe(false);
    });

    it('should return true when file exists', () => {
      (builder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const result = builder.existManifest('requirements.txt');
      expect(result).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith('/test/code/uri/requirements.txt exist');
    });
  });

  describe('language detection methods', () => {
    it('should detect Python language correctly', () => {
      const inputsWithPython = JSON.parse(JSON.stringify(mockInputs));
      inputsWithPython.props.runtime = 'python3.9';
      const builderWithPython = new TestBuilder(inputsWithPython);
      (builderWithPython as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (FC.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (builderWithPython as any).getRuntime = jest.fn().mockReturnValue('python3.9');

      const isPython = (builderWithPython as any).isPythonLanguage();
      expect(isPython).toBe(true);
    });

    it('should detect Node.js language correctly', () => {
      const inputsWithNodejs = JSON.parse(JSON.stringify(mockInputs));
      inputsWithNodejs.props.runtime = 'nodejs18';
      const builderWithNodejs = new TestBuilder(inputsWithNodejs);
      (builderWithNodejs as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (FC.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (builderWithNodejs as any).getRuntime = jest.fn().mockReturnValue('nodejs18');

      const isNodejs = (builderWithNodejs as any).isNodejsLanguage();
      expect(isNodejs).toBe(true);
    });

    it('should detect PHP language correctly', () => {
      const inputsWithPhp = JSON.parse(JSON.stringify(mockInputs));
      inputsWithPhp.props.runtime = 'php8.0';
      const builderWithPhp = new TestBuilder(inputsWithPhp);
      (builderWithPhp as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (FC.isCustomRuntime as jest.Mock).mockReturnValue(false);
      (builderWithPhp as any).getRuntime = jest.fn().mockReturnValue('php8.0');

      const isPhp = (builderWithPhp as any).isPhpLanguage();
      expect(isPhp).toBe(true);
    });
  });
});
