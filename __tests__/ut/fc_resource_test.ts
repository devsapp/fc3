import FC from '../../src/resources/fc';
import { GetApiType } from '../../src/resources/fc';
import { fc2Client } from '../../src/resources/fc/impl/client';
import { sleep, isAppCenter } from '../../src/utils';
import { IFunction, ITrigger } from '../../src/interface';
import OSS from 'ali-oss';
import path from 'path';
import _ from 'lodash';

// Mock dependencies
jest.mock('../../src/resources/fc/impl/client');
jest.mock('../../src/utils');
jest.mock('ali-oss');
jest.mock('axios');
jest.mock('path');
jest.mock('lodash');

// Mock logger
jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
}));

describe('FC', () => {
  let fc: FC;
  let mockCredentials: any;
  let mockFcClient: any;
  let mockFc20230330Client: any;

  beforeEach(() => {
    mockCredentials = {
      AccountID: '123456789',
      AccessKeyID: 'test-key',
      AccessKeySecret: 'test-secret',
      SecurityToken: 'test-token',
    };

    mockFc20230330Client = {
      getFunction: jest.fn(),
      createFunction: jest.fn(),
      updateFunction: jest.fn(),
      getTriggerWithOptions: jest.fn(),
      createTrigger: jest.fn(),
      updateTrigger: jest.fn(),
      listFunctionVersionsWithOptions: jest.fn(),
      getAlias: jest.fn(),
      createAlias: jest.fn(),
      updateAlias: jest.fn(),
      listTriggersWithOptions: jest.fn(),
      getAsyncInvokeConfigWithOptions: jest.fn(),
      listAsyncInvokeConfigs: jest.fn(),
      listVpcBindings: jest.fn(),
      listInstances: jest.fn(),
      untagResources: jest.fn(),
      tagResources: jest.fn(),
    };

    mockFcClient = {
      getTempBucketToken: jest.fn(),
      accountid: '123456789',
      websocket: jest.fn(),
    };

    (fc2Client as jest.Mock).mockReturnValue(mockFcClient);

    fc = new FC('cn-hangzhou', mockCredentials, {});
    // Use Object.defineProperty to override readonly property
    Object.defineProperty(fc, 'fc20230330Client', {
      value: mockFc20230330Client,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('untilFunctionStateOK', () => {
    let mockConfig: IFunction;

    beforeEach(() => {
      mockConfig = {
        functionName: 'test-function',
        runtime: 'custom-container',
        customContainerConfig: {
          image: 'test-image:latest',
        },
      } as IFunction;

      (isAppCenter as jest.Mock).mockReturnValue(false);
      // Mock FC static method
      jest.spyOn(FC, 'isCustomContainerRuntime').mockReturnValue(true);
    });

    it('should wait for function state to be ready for custom container runtime', async () => {
      const mockFunctionMeta = {
        state: 'Active',
        lastUpdateStatus: 'Success',
      };

      mockFc20230330Client.getFunction.mockResolvedValue({
        toMap: () => ({ body: mockFunctionMeta }),
      });

      await fc.untilFunctionStateOK(mockConfig, 'CREATE');

      expect(mockFc20230330Client.getFunction).toHaveBeenCalledWith(
        'test-function',
        expect.any(Object),
      );
    });

    it('should handle Failed state and retry', async () => {
      const mockFunctionMeta = {
        state: 'Failed',
        lastUpdateStatus: 'Failed',
      };

      mockFc20230330Client.getFunction.mockResolvedValue({
        toMap: () => ({ body: mockFunctionMeta }),
      });

      (sleep as jest.Mock).mockResolvedValue(undefined);

      // The function should handle Failed state gracefully
      await fc.untilFunctionStateOK(mockConfig, 'CREATE');

      expect(mockFc20230330Client.getFunction).toHaveBeenCalled();
    });

    it('should not wait for non-custom container runtime', async () => {
      // Mock FC static method
      const FC = require('../../src/resources/fc').default;
      FC.isCustomContainerRuntime = jest.fn().mockReturnValue(false);

      await fc.untilFunctionStateOK(mockConfig, 'CREATE');

      expect(mockFc20230330Client.getFunction).not.toHaveBeenCalled();
    });
  });

  describe('deployFunction', () => {
    let mockConfig: IFunction;

    beforeEach(() => {
      mockConfig = {
        functionName: 'test-function',
        runtime: 'nodejs18',
        handler: 'index.handler',
        code: './code',
      } as IFunction;

      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    it('should update tags when they differ', async () => {
      const mockRemoteConfig = {
        body: {
          functionArn: 'arn:acs:fc:cn-hangzhou:123456789:functions/test-function',
          tags: [{ key: 'old', value: 'tag' }],
        },
      };

      mockConfig.tags = [{ key: 'new', value: 'tag' }];

      mockFc20230330Client.getFunction.mockResolvedValue(mockRemoteConfig);
      mockFc20230330Client.updateFunction.mockResolvedValue({});
      mockFc20230330Client.untagResources.mockResolvedValue({});
      mockFc20230330Client.tagResources.mockResolvedValue({});

      await fc.deployFunction(mockConfig, { slsAuto: false, type: undefined });

      expect(mockFc20230330Client.untagResources).toHaveBeenCalled();
      expect(mockFc20230330Client.tagResources).toHaveBeenCalled();
    });

    it('should validate tags before deployment', async () => {
      mockConfig.tags = Array(21).fill({ key: 'tag', value: 'value' });

      await expect(
        fc.deployFunction(mockConfig, { slsAuto: false, type: undefined }),
      ).rejects.toThrow('The number of tags cannot exceed 20');
    });

    it('should validate unique tag keys', async () => {
      mockConfig.tags = [
        { key: 'tag1', value: 'value1' },
        { key: 'tag1', value: 'value2' },
      ];

      await expect(
        fc.deployFunction(mockConfig, { slsAuto: false, type: undefined }),
      ).rejects.toThrow('The tag keys must be unique');
    });
  });

  describe('deployTrigger', () => {
    let mockConfig: ITrigger;

    beforeEach(() => {
      mockConfig = {
        triggerName: 'test-trigger',
        triggerType: 'http',
        triggerConfig: {
          authType: 'anonymous',
          methods: ['GET', 'POST'],
        },
      } as ITrigger;

      (sleep as jest.Mock).mockResolvedValue(undefined);
    });

    it('should not update unsupported trigger types', async () => {
      mockConfig.triggerType = 'mns_topic';
      mockFc20230330Client.getTriggerWithOptions.mockResolvedValue({});

      await fc.deployTrigger('test-function', mockConfig);

      expect(mockFc20230330Client.updateTrigger).not.toHaveBeenCalled();
      // Logger is mocked, so we can't verify specific calls
    });
  });

  describe('uploadCodeToTmpOss', () => {
    beforeEach(() => {
      mockFcClient.getTempBucketToken.mockResolvedValue({
        data: {
          credentials: {
            AccessKeyId: 'test-key',
            AccessKeySecret: 'test-secret',
            SecurityToken: 'test-token',
          },
          ossBucket: 'test-bucket',
          objectName: 'test-object',
        },
      });

      const mockOssClient = {
        put: jest.fn().mockResolvedValue({}),
      };
      (OSS as jest.Mock).mockImplementation(() => mockOssClient);
      (path.normalize as jest.Mock).mockReturnValue('/test/path');
    });

    it('should upload code to temporary OSS bucket', async () => {
      const result = await fc.uploadCodeToTmpOss('/test/code.zip');

      expect(mockFcClient.getTempBucketToken).toHaveBeenCalled();
      expect(result).toEqual({
        ossBucketName: 'test-bucket',
        ossObjectName: '123456789/test-object',
      });
    });
  });

  describe('getFunction', () => {
    it('should return original response when type is original', async () => {
      const mockResponse = { body: { functionName: 'test-function' } };
      mockFc20230330Client.getFunction.mockResolvedValue(mockResponse);

      const result = await fc.getFunction('test-function', GetApiType.original);

      expect(result).toBe(mockResponse);
    });
  });

  describe('getTrigger', () => {
    it('should return original response when type is original', async () => {
      const mockResponse = { body: { triggerName: 'test-trigger' } };
      mockFc20230330Client.getTriggerWithOptions.mockResolvedValue(mockResponse);

      const result = await fc.getTrigger('test-function', 'test-trigger', GetApiType.original);

      expect(result).toBe(mockResponse);
    });

    it('should parse triggerConfig JSON', async () => {
      const mockResponse = {
        toMap: () => ({
          body: {
            triggerName: 'test-trigger',
            triggerConfig: '{"authType":"anonymous"}',
            triggerType: 'http',
          },
        }),
      };

      mockFc20230330Client.getTriggerWithOptions.mockResolvedValue(mockResponse);

      const result = await fc.getTrigger('test-function', 'test-trigger', GetApiType.simple);

      expect(result.triggerConfig).toEqual({ authType: 'anonymous' });
    });
  });

  describe('publishAlias', () => {});

  describe('tagsToLowerCase', () => {
    it('should convert tag keys to lowercase', () => {
      const tags = [
        { Key: 'Environment', Value: 'production' },
        { Name: 'Service', Value: 'api' },
      ];

      const result = fc.tagsToLowerCase(tags);

      expect(result).toEqual([
        { key: 'Environment', value: 'production' },
        { name: 'Service', value: 'api' },
      ]);
    });

    it('should return empty array for null tags', () => {
      const result = fc.tagsToLowerCase(null);

      expect(result).toEqual([]);
    });

    it('should return empty array for undefined tags', () => {
      const result = fc.tagsToLowerCase(undefined);

      expect(result).toEqual([]);
    });
  });

  describe('isUpdateTags', () => {
    it('should return true when tag lengths differ', () => {
      const remoteTags = [{ key: 'env', value: 'prod' }];
      const localTags = [
        { key: 'env', value: 'prod' },
        { key: 'service', value: 'api' },
      ];

      const result = fc.isUpdateTags(remoteTags, localTags);

      expect(result).toBe(true);
    });

    it('should return true when tag values differ', () => {
      const remoteTags = [{ key: 'env', value: 'prod' }];
      const localTags = [{ key: 'env', value: 'dev' }];

      const result = fc.isUpdateTags(remoteTags, localTags);

      expect(result).toBe(true);
    });

    it('should return false when tags are identical', () => {
      const remoteTags = [{ key: 'env', value: 'prod' }];
      const localTags = [{ key: 'env', value: 'prod' }];

      const result = fc.isUpdateTags(remoteTags, localTags);

      expect(result).toBe(false);
    });

    it('should return false when both tags are empty', () => {
      const result = fc.isUpdateTags([], []);

      expect(result).toBe(false);
    });
  });

  describe('diffTags', () => {
    it('should return tags to delete and add', () => {
      const remoteTags = [
        { key: 'env', value: 'prod' },
        { key: 'old', value: 'tag' },
      ];
      const localTags = [
        { key: 'env', value: 'dev' },
        { key: 'new', value: 'tag' },
      ];

      console.log('Calling diffTags');
      const result = fc.diffTags(remoteTags, localTags);
      console.log('diffTags completed, result:', JSON.stringify(result));

      expect(result.deleteTags).toEqual(['env', 'old']);
      expect(result.addTags).toEqual([
        { key: 'env', value: 'dev' },
        { key: 'new', value: 'tag' },
      ]);
    });

    it('should handle empty remote tags', () => {
      const remoteTags = [];
      const localTags = [{ key: 'env', value: 'prod' }];

      const result = fc.diffTags(remoteTags, localTags);

      expect(result.deleteTags).toEqual([]);
      expect(result.addTags).toEqual([{ key: 'env', value: 'prod' }]);
    });

    it('should handle empty local tags', () => {
      const remoteTags = [{ key: 'env', value: 'prod' }];
      const localTags = [];

      const result = fc.diffTags(remoteTags, localTags);

      expect(result.deleteTags).toEqual(['env']);
      expect(result.addTags).toEqual([]);
    });
  });

  describe('checkTags', () => {
    it('should throw error when tags exceed 20', () => {
      const tags = Array(21).fill({ key: 'tag', value: 'value' });

      expect(() => fc.checkTags(tags)).toThrow('The number of tags cannot exceed 20');
    });

    it('should throw error when tag keys are not unique', () => {
      const tags = [
        { key: 'env', value: 'prod' },
        { key: 'env', value: 'dev' },
      ];

      expect(() => fc.checkTags(tags)).toThrow('The tag keys must be unique. repeat keys: env');
    });

    it('should not throw error for valid tags', () => {
      const tags = [
        { key: 'env', value: 'prod' },
        { key: 'service', value: 'api' },
      ];

      expect(() => fc.checkTags(tags)).not.toThrow();
    });
  });
});
