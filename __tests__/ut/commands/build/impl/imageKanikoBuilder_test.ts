import { ImageKanikoBuilder } from '../../../../../src/subCommands/build/impl/imageKanikoBuilder';
import logger from '../../../../../src/logger';
import { runCommand } from '../../../../../src/utils';

// Mock external dependencies
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../../../../src/utils');

describe('ImageKanikoBuilder', () => {
  let imageKanikoBuilder: ImageKanikoBuilder;
  let mockInputs: any;

  class TestImageKanikoBuilder extends ImageKanikoBuilder {
    constructor(inputs: any) {
      super(inputs);
    }

    getBuildContext() {
      return {
        dockerFile: '/test/docker/file',
        context: '/test/context',
      };
    }

    async getRuntimeBuildImage() {
      return 'test-image:latest';
    }

    async mockDockerLogin() {
      // Mock implementation
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
      },
      args: '',
    } as any;

    imageKanikoBuilder = new TestImageKanikoBuilder(mockInputs);

    // Mock runCommand
    (runCommand as any).mockResolvedValue(undefined);

    // Spy on mockDockerLogin
    jest.spyOn(imageKanikoBuilder, 'mockDockerLogin').mockResolvedValue(undefined);
  });

  describe('runBuild', () => {
    it('should execute kaniko build command with correct parameters', async () => {
      await imageKanikoBuilder.runBuild();

      expect(logger.debug).toHaveBeenCalledWith(
        `ImageKanikoBuilder building ... ${JSON.stringify(mockInputs)}`,
      );
      expect(imageKanikoBuilder.mockDockerLogin).toHaveBeenCalled();
      expect(runCommand).toHaveBeenCalledWith(
        'executor --force=true --cache=false --use-new-run=true --dockerfile /test/docker/file --context /test/context --destination test-image:latest',
        'inherit',
      );
    });
  });
});
