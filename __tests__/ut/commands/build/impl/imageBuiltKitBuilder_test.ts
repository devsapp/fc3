import { ImageBuiltKitBuilder } from '../../../../../src/subCommands/build/impl/imageBuiltKitBuilder';
import logger from '../../../../../src/logger';
import { runCommand } from '../../../../../src/utils';
import * as path from 'path';

// Mock external dependencies
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../src/utils');
jest.mock('path');

describe('ImageBuiltKitBuilder', () => {
  let imageBuiltKitBuilder: ImageBuiltKitBuilder;
  let mockInputs: any;

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
      },
      args: ['--dockerfile', 'Dockerfile.custom', '--context', '/custom/context'],
    } as any;

    imageBuiltKitBuilder = new ImageBuiltKitBuilder(mockInputs);

    // Mock path functions
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    (path.basename as jest.Mock).mockImplementation((p) => p.split('/').pop());
    (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));

    // Mock runCommand
    (runCommand as any).mockResolvedValue(undefined);
  });

  describe('runBuild', () => {
    it('should execute buildkit build command with correct parameters', async () => {
      // Mock getBuildContext to return predictable values
      (imageBuiltKitBuilder as any).getBuildContext = jest.fn().mockReturnValue({
        dockerFileName: 'Dockerfile.custom',
        context: '/custom/context',
      });

      // Mock getRuntimeBuildImage to return a fixed value
      (imageBuiltKitBuilder as any).getRuntimeBuildImage = jest
        .fn()
        .mockResolvedValue('test-image:latest');

      // Mock mockDockerLogin to avoid actual implementation
      (imageBuiltKitBuilder as any).mockDockerLogin = jest.fn().mockResolvedValue(undefined);

      await imageBuiltKitBuilder.runBuild();

      expect(logger.debug).toHaveBeenCalledWith(
        `ImageBuiltKitBuilder building ... ${JSON.stringify(mockInputs)}`,
      );
      expect(imageBuiltKitBuilder.mockDockerLogin).toHaveBeenCalled();
      expect(runCommand).toHaveBeenCalledWith(
        'buildctl --addr tcp://localhost:65360 build --no-cache --frontend dockerfile.v0 --local context=/custom/context --local dockerfile=/custom/context --opt filename=Dockerfile.custom --output type=image,name=test-image:latest,push=true',
        'inherit',
      );
    });
  });

  describe('getBuildContext', () => {
    it('should return default build context', () => {
      // Reset opts to test default behavior
      (imageBuiltKitBuilder as any).opts = {};
      (imageBuiltKitBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');

      const context = (imageBuiltKitBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFileName: 'Dockerfile',
        context: '/test/code/uri',
      });
    });

    it('should return custom build context when dockerfile option is provided', () => {
      (imageBuiltKitBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');

      const context = (imageBuiltKitBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFileName: 'Dockerfile.custom',
        context: '/custom/context',
      });
    });

    it('should return custom build context when context option is provided', () => {
      // Test with only context option
      (imageBuiltKitBuilder as any).opts = { context: '/another/context' };
      (imageBuiltKitBuilder as any).getCodeUri = jest.fn().mockReturnValue('/test/code/uri');

      const context = (imageBuiltKitBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFileName: 'Dockerfile',
        context: '/another/context',
      });
    });

    it('should handle absolute paths correctly', () => {
      (imageBuiltKitBuilder as any).opts = {
        dockerfile: '/absolute/Dockerfile.custom',
        context: '/absolute/context',
      };
      (path.isAbsolute as jest.Mock).mockImplementation((p) => p.startsWith('/'));

      const context = (imageBuiltKitBuilder as any).getBuildContext();

      expect(context).toEqual({
        dockerFileName: 'Dockerfile.custom',
        context: '/absolute/context',
      });
    });
  });
});
