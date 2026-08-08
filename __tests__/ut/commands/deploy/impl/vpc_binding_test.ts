import VpcBinding from '../../../../../src/subCommands/deploy/impl/vpc_binding';
import { IInputs } from '../../../../../src/interface';
import logger from '../../../../../src/logger';

jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/utils');
jest.mock('inquirer');

jest.mock('@serverless-devs/diff', () => ({
  diffConvertYaml: jest.fn(() => ({ diffResult: {}, show: '' })),
}));

describe('VpcBinding', () => {
  let mockInputs: IInputs;
  let mockOpts: any;

  beforeEach(() => {
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        vpcBinding: {
          vpcIds: ['vpc-b', 'vpc-a'],
        },
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

    mockOpts = { yes: true };

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
    it('sets functionName and sorts local vpcIds', () => {
      // Act
      const vpcBinding = new VpcBinding(mockInputs, mockOpts);

      // Assert
      expect(vpcBinding.functionName).toBe('test-function');
      expect(vpcBinding.local.vpcIds).toEqual(['vpc-a', 'vpc-b']);
    });

    it('defaults local to an empty object when vpcBinding is absent', () => {
      // Arrange
      const inputsNoBinding = {
        ...mockInputs,
        props: { ...mockInputs.props, vpcBinding: undefined },
      } as any;

      // Act
      const vpcBinding = new VpcBinding(inputsNoBinding, mockOpts);

      // Assert
      expect(vpcBinding.local).toEqual({});
    });
  });

  describe('before', () => {
    it('calls _getRemote and _plan', async () => {
      // Arrange
      const vpcBinding = new VpcBinding(mockInputs, mockOpts);
      const getRemoteSpy = jest
        .spyOn(vpcBinding as any, '_getRemote')
        .mockResolvedValue(undefined);
      const planSpy = jest.spyOn(vpcBinding as any, '_plan').mockResolvedValue(undefined);

      // Act
      await vpcBinding.before();

      // Assert
      expect(getRemoteSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
    });
  });

  describe('run', () => {
    it('creates all local vpc bindings when remote is empty (happy path)', async () => {
      // Arrange
      const vpcBinding = new VpcBinding(mockInputs, mockOpts);
      vpcBinding.needDeploy = true;
      vpcBinding.remote = {};

      const mockFcSdk = {
        createVpcBinding: jest.fn().mockResolvedValue(undefined),
        deleteVpcBinding: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(vpcBinding, 'fcSdk', { value: mockFcSdk, writable: true });

      // Act
      const result = await vpcBinding.run();

      // Assert
      expect(mockFcSdk.deleteVpcBinding).not.toHaveBeenCalled();
      expect(mockFcSdk.createVpcBinding).toHaveBeenCalledWith('test-function', 'vpc-a');
      expect(mockFcSdk.createVpcBinding).toHaveBeenCalledWith('test-function', 'vpc-b');
      expect(result).toBe(true);
    });

    it('deletes stale and adds new vpc bindings based on the diff', async () => {
      // Arrange
      const vpcBinding = new VpcBinding(mockInputs, mockOpts);
      vpcBinding.needDeploy = true;
      // remote has vpc-a and vpc-c; local has vpc-a and vpc-b
      vpcBinding.remote = { vpcIds: ['vpc-a', 'vpc-c'] };

      const mockFcSdk = {
        createVpcBinding: jest.fn().mockResolvedValue(undefined),
        deleteVpcBinding: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(vpcBinding, 'fcSdk', { value: mockFcSdk, writable: true });

      // Act
      await vpcBinding.run();

      // Assert
      expect(mockFcSdk.deleteVpcBinding).toHaveBeenCalledWith('test-function', 'vpc-c');
      expect(mockFcSdk.deleteVpcBinding).toHaveBeenCalledTimes(1);
      expect(mockFcSdk.createVpcBinding).toHaveBeenCalledWith('test-function', 'vpc-b');
      expect(mockFcSdk.createVpcBinding).toHaveBeenCalledTimes(1);
    });

    it('does nothing and returns needDeploy when needDeploy is false', async () => {
      // Arrange
      const vpcBinding = new VpcBinding(mockInputs, mockOpts);
      vpcBinding.needDeploy = false;
      vpcBinding.remote = {};

      const mockFcSdk = {
        createVpcBinding: jest.fn(),
        deleteVpcBinding: jest.fn(),
      };
      Object.defineProperty(vpcBinding, 'fcSdk', { value: mockFcSdk, writable: true });

      // Act
      const result = await vpcBinding.run();

      // Assert
      expect(mockFcSdk.createVpcBinding).not.toHaveBeenCalled();
      expect(mockFcSdk.deleteVpcBinding).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
