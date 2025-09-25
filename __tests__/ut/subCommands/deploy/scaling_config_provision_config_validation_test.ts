import Deploy from '../../../../src/subCommands/deploy/index';
import Info from '../../../../src/subCommands/info/index';
import Remove from '../../../../src/subCommands/remove/index';
import Plan from '../../../../src/subCommands/plan/index';
import { IInputs } from '../../../../src/interface';
import logger from '../../../../src/logger';

describe('ScalingConfig and ProvisionConfig validation', () => {
  let mockInputs: IInputs;

  beforeEach(() => {
    // Mock logger
    logger.debug = jest.fn();
    logger.info = jest.fn();
    logger.warn = jest.fn();
    logger.error = jest.fn();
    logger.write = jest.fn();

    // Mock inputs
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        SecurityToken: 'test-security-token',
        Region: 'cn-hangzhou',
      },
      args: [],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;
  });

  describe('Deploy command', () => {
    it('should throw error when both scalingConfig and provisionConfig are present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Deploy(mockInputs)).toThrow(
        'scalingConfig and provisionConfig cannot be used at the same time',
      );
    });

    it('should not throw error when only scalingConfig is present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      expect(() => new Deploy(mockInputs)).not.toThrow();
    });

    it('should not throw error when only provisionConfig is present', () => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Deploy(mockInputs)).not.toThrow();
    });

    it('should not throw error when neither scalingConfig nor provisionConfig is present', () => {
      expect(() => new Deploy(mockInputs)).not.toThrow();
    });
  });

  describe('Info command', () => {
    it('should throw error when both scalingConfig and provisionConfig are present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Info(mockInputs)).toThrow(
        'scalingConfig and provisionConfig cannot be used at the same time',
      );
    });

    it('should not throw error when only scalingConfig is present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      expect(() => new Info(mockInputs)).not.toThrow();
    });

    it('should not throw error when only provisionConfig is present', () => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Info(mockInputs)).not.toThrow();
    });

    it('should not throw error when neither scalingConfig nor provisionConfig is present', () => {
      expect(() => new Info(mockInputs)).not.toThrow();
    });
  });

  describe('Remove command', () => {
    it('should not throw error when both scalingConfig and provisionConfig are present (no validation in Remove class)', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      // The Remove class currently does not validate scalingConfig and provisionConfig conflict
      expect(() => new Remove(mockInputs)).not.toThrow();
    });

    it('should not throw error when only scalingConfig is present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      expect(() => new Remove(mockInputs)).not.toThrow();
    });

    it('should not throw error when only provisionConfig is present', () => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Remove(mockInputs)).not.toThrow();
    });

    it('should not throw error when neither scalingConfig nor provisionConfig is present', () => {
      expect(() => new Remove(mockInputs)).not.toThrow();
    });
  });

  describe('Plan command', () => {
    it('should throw error when both scalingConfig and provisionConfig are present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Plan(mockInputs)).toThrow(
        'scalingConfig and provisionConfig cannot be used at the same time',
      );
    });

    it('should not throw error when only scalingConfig is present', () => {
      mockInputs.props.scalingConfig = {
        minInstances: 1,
      };

      expect(() => new Plan(mockInputs)).not.toThrow();
    });

    it('should not throw error when only provisionConfig is present', () => {
      mockInputs.props.provisionConfig = {
        defaultTarget: 1,
        alwaysAllocateCPU: false,
        alwaysAllocateGPU: false,
        scheduledActions: [],
        targetTrackingPolicies: [],
      };

      expect(() => new Plan(mockInputs)).not.toThrow();
    });

    it('should not throw error when neither scalingConfig nor provisionConfig is present', () => {
      expect(() => new Plan(mockInputs)).not.toThrow();
    });
  });
});
