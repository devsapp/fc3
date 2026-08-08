import Trigger from '../../../../../src/subCommands/deploy/impl/trigger';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';

jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/utils');
jest.mock('inquirer');

jest.mock('@serverless-devs/diff', () => ({
  diffConvertYaml: jest.fn(() => ({ diffResult: {}, show: '' })),
}));

describe('Trigger', () => {
  let mockInputs: IInputs;
  let mockOpts: any;

  beforeEach(() => {
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        triggers: [
          {
            triggerName: 'httpTrigger',
            triggerType: 'http',
            triggerConfig: {
              authType: 'anonymous',
              methods: ['GET'],
            },
          },
        ],
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        Region: 'cn-hangzhou',
      },
      args: [],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;

    mockOpts = { yes: true, trigger: undefined };

    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('initializes local triggers with defaults and sets functionName', () => {
      // Act
      const trigger = new Trigger(mockInputs, mockOpts);

      // Assert
      expect(trigger.functionName).toBe('test-function');
      expect(trigger.local).toHaveLength(1);
      expect(trigger.local[0].triggerName).toBe('httpTrigger');
    });

    it('filters triggers when a specific trigger name is requested', () => {
      // Act
      const trigger = new Trigger(mockInputs, { ...mockOpts, trigger: 'nonexistent' });

      // Assert
      expect(trigger.local).toHaveLength(0);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('before', () => {
    it('calls _getRemote and _plan', async () => {
      // Arrange
      const trigger = new Trigger(mockInputs, mockOpts);
      const getRemoteSpy = jest
        .spyOn(trigger as any, '_getRemote')
        .mockResolvedValue(undefined);
      const planSpy = jest.spyOn(trigger as any, '_plan').mockResolvedValue(undefined);

      // Act
      await trigger.before();

      // Assert
      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('checkUpdateEBTrigger', () => {
    it('returns true when the remote config is empty', () => {
      // Arrange
      const trigger = new Trigger(mockInputs, mockOpts);

      // Act
      const result = trigger.checkUpdateEBTrigger(trigger.local[0], {});

      // Assert
      expect(result).toBe(true);
    });

    it('returns false for an eventbridge trigger with no diff', () => {
      // Arrange
      const trigger = new Trigger(mockInputs, mockOpts);

      // Act
      const result = trigger.checkUpdateEBTrigger(trigger.local[0], {
        triggerType: 'eventbridge',
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('run', () => {
    it('deploys the trigger on the happy path when needDeploy is true', async () => {
      // Arrange
      const trigger = new Trigger(mockInputs, mockOpts);
      trigger.needDeploy = true;
      trigger.remote = [{}];

      const mockFcSdk = {
        deployTrigger: jest.fn().mockResolvedValue(undefined),
        createTrigger: jest.fn(),
      };
      Object.defineProperty(trigger, 'fcSdk', { value: mockFcSdk, writable: true });

      // Act
      const result = await trigger.run();

      // Assert
      expect(mockFcSdk.deployTrigger).toHaveBeenCalledWith(
        'test-function',
        expect.objectContaining({ triggerName: 'httpTrigger' }),
      );
      expect(result).toBe(true);
    });

    it('re-throws when createTrigger fails with a non-FunctionAlreadyExists error', async () => {
      // Arrange
      const trigger = new Trigger(mockInputs, mockOpts);
      trigger.needDeploy = false;
      trigger.remote = [{}];

      const createErr = Object.assign(new Error('create boom'), { code: 'SomeOtherError' });
      const mockFcSdk = {
        deployTrigger: jest.fn(),
        createTrigger: jest.fn().mockRejectedValue(createErr),
      };
      Object.defineProperty(trigger, 'fcSdk', { value: mockFcSdk, writable: true });

      // Act & Assert
      await expect(trigger.run()).rejects.toThrow('create boom');
      expect(mockFcSdk.createTrigger).toHaveBeenCalled();
    });
  });
});
