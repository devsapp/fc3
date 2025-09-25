import { ImageBuilder } from '../../../../../src/subCommands/build/impl/baseImageBuilder';
import { IInputs, IProps } from '../../../../../src/interface';
import logger from '../../../../../src/logger';
import { parseArgv } from '@serverless-devs/utils';
import * as path from 'path';

// Mock external dependencies
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../src/utils');
jest.mock('@serverless-devs/utils');
jest.mock('path');

describe('ImageBuilder', () => {
  let mockInputs: IInputs;
  let imageBuilder: ImageBuilder;

  class TestImageBuilder extends ImageBuilder {
    constructor(inputs: any) {
      super(inputs);
    }

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
      } as IProps,
      args: '--dockerfile Dockerfile.custom --context /custom/context',
    } as any;

    // Mock parseArgv to return predictable options
    (parseArgv as jest.Mock).mockReturnValue({
      dockerfile: 'Dockerfile.custom',
      context: '/custom/context',
      help: false,
    });

    imageBuilder = new TestImageBuilder(mockInputs);

    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));

    // Mock getCodeUri to return a fixed value
    (imageBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
  });

  describe('constructor', () => {
    it('should create ImageBuilder instance with correct options', () => {
      expect(imageBuilder).toBeDefined();
      expect((imageBuilder as any).opts).toEqual({
        dockerfile: 'Dockerfile.custom',
        context: '/custom/context',
        help: false,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'ImageBuilder opts: {"dockerfile":"Dockerfile.custom","context":"/custom/context","help":false}',
      );
    });
  });

  describe('getBuildContext', () => {
    it('should return default build context', () => {
      // Reset opts to empty object to test default behavior
      (imageBuilder as any).opts = {};
      (imageBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');

      const context = (imageBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFile: '/test/code/uri/Dockerfile',
        context: '/test/code/uri',
      });
    });

    it('should return custom build context when dockerfile option is provided', () => {
      // Reset opts to only include dockerfile option
      (imageBuilder as any).opts = { dockerfile: 'Dockerfile.custom' };
      (imageBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');
      (imageBuilder as any).baseDir = '/test/base/dir';

      const context = (imageBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFile: '/test/base/dir/Dockerfile.custom',
        context: '/test/base/dir',
      });
    });

    it('should return custom build context when context option is provided', () => {
      // Test with only context option
      (imageBuilder as any).opts = { context: '/another/context' };
      (imageBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');

      const context = (imageBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFile: '/test/code/uri/Dockerfile',
        context: '/another/context',
      });
    });

    it('should handle absolute paths correctly', () => {
      (imageBuilder as any).opts = {
        dockerfile: '/absolute/Dockerfile.custom',
        context: '/absolute/context',
      };
      (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));

      const context = (imageBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFile: '/absolute/Dockerfile.custom',
        context: '/absolute/context',
      });
    });
  });
});
