import BuilderFactory, { BuildType } from '../../../src/subCommands/build';
import { ImageBuiltKitBuilder } from '../../../src/subCommands/build/impl/imageBuiltKitBuilder';
import { ImageDockerBuilder } from '../../../src/subCommands/build/impl/imageDockerBuilder';
import { ImageKanikoBuilder } from '../../../src/subCommands/build/impl/imageKanikoBuilder';
import { DefaultBuilder } from '../../../src/subCommands/build/impl/defaultBuilder';
import { IInputs } from '../../../src/interface';

// Mock dependencies
jest.mock('../../../src/subCommands/build/impl/imageBuiltKitBuilder');
jest.mock('../../../src/subCommands/build/impl/imageDockerBuilder');
jest.mock('../../../src/subCommands/build/impl/imageKanikoBuilder');
jest.mock('../../../src/subCommands/build/impl/defaultBuilder');
jest.mock('../../../src/subCommands/build/impl/baseBuilder');

// Mock logger
jest.mock('../../../src/logger', () => ({
  error: jest.fn(),
}));

describe('BuilderFactory', () => {
  let mockInputs: IInputs;

  beforeEach(() => {
    mockInputs = {
      cwd: '/test',
      baseDir: '/test',
      name: 'test-app',
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        code: './code',
      },
      command: 'build',
      args: [],
      yaml: {
        path: '/test/s.yaml',
      },
      resource: {
        name: 'test-resource',
        component: 'fc3',
        access: 'default',
      },
      outputs: {},
      getCredential: jest.fn().mockResolvedValue({
        AccountID: '123456789',
        AccessKeyID: 'test-key',
        AccessKeySecret: 'test-secret',
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBuilder', () => {
    it('should return ImageDockerBuilder for ImageDocker build type', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const result = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);

      expect(ImageDockerBuilder).toHaveBeenCalledWith(mockInputs);
      expect(result).toBe(mockBuilder);
    });

    it('should return ImageBuiltKitBuilder for ImageBuildKit build type', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageBuiltKitBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const result = BuilderFactory.getBuilder(BuildType.ImageBuildKit, mockInputs);

      expect(ImageBuiltKitBuilder).toHaveBeenCalledWith(mockInputs);
      expect(result).toBe(mockBuilder);
    });

    it('should return ImageKanikoBuilder for ImageKaniko build type', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageKanikoBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const result = BuilderFactory.getBuilder(BuildType.ImageKaniko, mockInputs);

      expect(ImageKanikoBuilder).toHaveBeenCalledWith(mockInputs);
      expect(result).toBe(mockBuilder);
    });

    it('should return DefaultBuilder for Default build type', () => {
      const mockBuilder = { build: jest.fn() };
      (DefaultBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const result = BuilderFactory.getBuilder(BuildType.Default, mockInputs);

      expect(DefaultBuilder).toHaveBeenCalledWith(mockInputs);
      expect(result).toBe(mockBuilder);
    });

    it('should throw error for invalid build type', () => {
      const invalidBuildType = 'INVALID_BUILD_TYPE' as any;

      expect(() => BuilderFactory.getBuilder(invalidBuildType, mockInputs)).toThrow(
        'Invalid buildType INVALID_BUILD_TYPE',
      );
      // Logger is mocked, so we can't verify specific calls
    });

    it('should throw error for undefined build type', () => {
      const undefinedBuildType = undefined as any;

      expect(() => BuilderFactory.getBuilder(undefinedBuildType, mockInputs)).toThrow(
        'Invalid buildType undefined',
      );
      // Logger is mocked, so we can't verify specific calls
    });

    it('should throw error for null build type', () => {
      const nullBuildType = null as any;

      expect(() => BuilderFactory.getBuilder(nullBuildType, mockInputs)).toThrow(
        'Invalid buildType null',
      );
      // Logger is mocked, so we can't verify specific calls
    });
  });

  describe('BuildType enum', () => {
    it('should have correct values', () => {
      expect(BuildType.ImageDocker).toBe('IAMGE_BULD_DOCKER');
      expect(BuildType.ImageBuildKit).toBe('IAMGE_BULD_KIT');
      expect(BuildType.ImageKaniko).toBe('IMAGE_BUILD_KANIKO');
      expect(BuildType.Default).toBe('DEFAULT');
    });
  });

  describe('Builder instances', () => {
    it('should create ImageDockerBuilder with correct inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);

      expect(ImageDockerBuilder).toHaveBeenCalledWith(mockInputs);
    });

    it('should create ImageBuiltKitBuilder with correct inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageBuiltKitBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      BuilderFactory.getBuilder(BuildType.ImageBuildKit, mockInputs);

      expect(ImageBuiltKitBuilder).toHaveBeenCalledWith(mockInputs);
    });

    it('should create ImageKanikoBuilder with correct inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageKanikoBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      BuilderFactory.getBuilder(BuildType.ImageKaniko, mockInputs);

      expect(ImageKanikoBuilder).toHaveBeenCalledWith(mockInputs);
    });

    it('should create DefaultBuilder with correct inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (DefaultBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      BuilderFactory.getBuilder(BuildType.Default, mockInputs);

      expect(DefaultBuilder).toHaveBeenCalledWith(mockInputs);
    });
  });

  describe('Builder methods', () => {
    it('should call build method on ImageDockerBuilder', async () => {
      const mockBuilder = { build: jest.fn().mockResolvedValue({ success: true }) };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const builder = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);
      const result = await builder.build();

      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should call build method on ImageBuiltKitBuilder', async () => {
      const mockBuilder = { build: jest.fn().mockResolvedValue({ success: true }) };
      (ImageBuiltKitBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const builder = BuilderFactory.getBuilder(BuildType.ImageBuildKit, mockInputs);
      const result = await builder.build();

      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should call build method on ImageKanikoBuilder', async () => {
      const mockBuilder = { build: jest.fn().mockResolvedValue({ success: true }) };
      (ImageKanikoBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const builder = BuilderFactory.getBuilder(BuildType.ImageKaniko, mockInputs);
      const result = await builder.build();

      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should call build method on DefaultBuilder', async () => {
      const mockBuilder = { build: jest.fn().mockResolvedValue({ success: true }) };
      (DefaultBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const builder = BuilderFactory.getBuilder(BuildType.Default, mockInputs);
      const result = await builder.build();

      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('Error handling', () => {
    it('should handle builder constructor throwing error', () => {
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => {
        throw new Error('Constructor failed');
      });

      expect(() => BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs)).toThrow(
        'Constructor failed',
      );
    });

    it('should handle builder build method throwing error', async () => {
      const mockBuilder = {
        build: jest.fn().mockRejectedValue(new Error('Build failed')),
      };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      const builder = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);

      await expect(builder.build()).rejects.toThrow('Build failed');
    });
  });

  describe('Input validation', () => {
    it('should handle null inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      expect(() => BuilderFactory.getBuilder(BuildType.ImageDocker, null as any)).not.toThrow();
      expect(ImageDockerBuilder).toHaveBeenCalledWith(null);
    });

    it('should handle undefined inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      expect(() =>
        BuilderFactory.getBuilder(BuildType.ImageDocker, undefined as any),
      ).not.toThrow();
      expect(ImageDockerBuilder).toHaveBeenCalledWith(undefined);
    });

    it('should handle empty inputs', () => {
      const mockBuilder = { build: jest.fn() };
      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockBuilder);

      expect(() => BuilderFactory.getBuilder(BuildType.ImageDocker, {} as any)).not.toThrow();
      expect(ImageDockerBuilder).toHaveBeenCalledWith({});
    });
  });

  describe('Multiple builder instances', () => {
    it('should create separate instances for each builder type', () => {
      const mockDockerBuilder = { build: jest.fn() };
      const mockKanikoBuilder = { build: jest.fn() };
      const mockDefaultBuilder = { build: jest.fn() };

      (ImageDockerBuilder as jest.Mock).mockImplementation(() => mockDockerBuilder);
      (ImageKanikoBuilder as jest.Mock).mockImplementation(() => mockKanikoBuilder);
      (DefaultBuilder as jest.Mock).mockImplementation(() => mockDefaultBuilder);

      const dockerBuilder = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);
      const kanikoBuilder = BuilderFactory.getBuilder(BuildType.ImageKaniko, mockInputs);
      const defaultBuilder = BuilderFactory.getBuilder(BuildType.Default, mockInputs);

      expect(dockerBuilder).toBe(mockDockerBuilder);
      expect(kanikoBuilder).toBe(mockKanikoBuilder);
      expect(defaultBuilder).toBe(mockDefaultBuilder);
    });

    it('should create multiple instances of the same builder type', () => {
      const mockBuilder1 = { build: jest.fn() };
      const mockBuilder2 = { build: jest.fn() };

      (ImageDockerBuilder as jest.Mock)
        .mockImplementationOnce(() => mockBuilder1)
        .mockImplementationOnce(() => mockBuilder2);

      const builder1 = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);
      const builder2 = BuilderFactory.getBuilder(BuildType.ImageDocker, mockInputs);

      expect(builder1).toBe(mockBuilder1);
      expect(builder2).toBe(mockBuilder2);
    });
  });
});
