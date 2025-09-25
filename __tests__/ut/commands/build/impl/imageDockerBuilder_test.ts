import { ImageDockerBuilder } from '../../../../../src/subCommands/build/impl/imageDockerBuilder';
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

describe('ImageDockerBuilder', () => {
  let imageDockerBuilder: ImageDockerBuilder;
  let mockInputs: any;

  class TestImageDockerBuilder extends ImageDockerBuilder {
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

    imageDockerBuilder = new TestImageDockerBuilder(mockInputs);

    // Mock runCommand
    (runCommand as any).mockResolvedValue(undefined);
  });

  describe('runBuild', () => {
    it('should execute docker build command with correct parameters', async () => {
      await imageDockerBuilder.runBuild();

      expect(logger.debug).toHaveBeenCalledWith(
        `ImageDockerBuilder building ... ${JSON.stringify(mockInputs)}`,
      );
      expect(runCommand).toHaveBeenCalledWith(
        'docker build --platform linux/amd64 -t test-image:latest -f /test/docker/file /test/context',
        'inherit',
      );
    });
  });
});
