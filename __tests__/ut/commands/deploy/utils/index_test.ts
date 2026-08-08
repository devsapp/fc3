import {
  provisionConfigErrorRetry,
  removeScalingConfigSDK,
} from '../../../../../src/subCommands/deploy/utils';
import { isProvisionConfigError, sleep } from '../../../../../src/utils';

jest.mock('../../../../../src/utils');

jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const isProvisionConfigErrorMock = isProvisionConfigError as jest.Mock;
const sleepMock = sleep as jest.Mock;

const FUNCTION_NAME = 'test-function';
const QUALIFIER = 'LATEST';
const LOCAL_CONFIG = { defaultTarget: 5 };

describe('provisionConfigErrorRetry', () => {
  beforeEach(() => {
    // Keep retries instant
    sleepMock.mockResolvedValue(undefined);
    isProvisionConfigErrorMock.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls putFunctionProvisionConfig on happy path for ProvisionConfig command', async () => {
    // Arrange
    const fcSdk = {
      putFunctionProvisionConfig: jest.fn().mockResolvedValue(undefined),
      putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
    };

    // Act
    await provisionConfigErrorRetry(fcSdk, 'ProvisionConfig', FUNCTION_NAME, QUALIFIER, LOCAL_CONFIG);

    // Assert
    expect(fcSdk.putFunctionProvisionConfig).toHaveBeenCalledWith(
      FUNCTION_NAME,
      QUALIFIER,
      LOCAL_CONFIG,
    );
    expect(fcSdk.putFunctionScalingConfig).not.toHaveBeenCalled();
  });

  it('calls putFunctionScalingConfig on happy path for non-ProvisionConfig command', async () => {
    // Arrange
    const fcSdk = {
      putFunctionProvisionConfig: jest.fn().mockResolvedValue(undefined),
      putFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
    };

    // Act
    await provisionConfigErrorRetry(fcSdk, 'ScalingConfig', FUNCTION_NAME, QUALIFIER, LOCAL_CONFIG);

    // Assert
    expect(fcSdk.putFunctionScalingConfig).toHaveBeenCalledWith(
      FUNCTION_NAME,
      QUALIFIER,
      LOCAL_CONFIG,
    );
    expect(fcSdk.putFunctionProvisionConfig).not.toHaveBeenCalled();
  });

  it('re-throws non-provision-config errors without retrying', async () => {
    // Arrange
    const err = new Error('some other error');
    const fcSdk = {
      putFunctionProvisionConfig: jest.fn().mockRejectedValue(err),
      removeFunctionScalingConfig: jest.fn(),
    };
    isProvisionConfigErrorMock.mockReturnValue(false);

    // Act & Assert
    await expect(
      provisionConfigErrorRetry(fcSdk, 'ProvisionConfig', FUNCTION_NAME, QUALIFIER, LOCAL_CONFIG),
    ).rejects.toThrow('some other error');
    expect(fcSdk.removeFunctionScalingConfig).not.toHaveBeenCalled();
  });

  it('removes scaling config and retries successfully after a provision-config error', async () => {
    // Arrange
    const provisionErr = new Error('provision config conflict');
    const fcSdk = {
      putFunctionProvisionConfig: jest
        .fn()
        .mockRejectedValueOnce(provisionErr)
        .mockResolvedValue(undefined),
      removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      getFunctionScalingConfig: jest.fn().mockResolvedValue({ currentInstances: 0 }),
    };
    isProvisionConfigErrorMock.mockReturnValue(true);

    // Act
    await provisionConfigErrorRetry(fcSdk, 'ProvisionConfig', FUNCTION_NAME, QUALIFIER, LOCAL_CONFIG);

    // Assert
    expect(fcSdk.removeFunctionScalingConfig).toHaveBeenCalledWith(FUNCTION_NAME, QUALIFIER);
    expect(fcSdk.putFunctionProvisionConfig).toHaveBeenCalledTimes(2);
  });
});

describe('removeScalingConfigSDK', () => {
  beforeEach(() => {
    sleepMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns immediately when currentInstances is 0', async () => {
    // Arrange
    const fcSdk = {
      removeFunctionScalingConfig: jest.fn().mockResolvedValue(undefined),
      getFunctionScalingConfig: jest.fn().mockResolvedValue({ currentInstances: 0 }),
    };

    // Act
    await removeScalingConfigSDK(fcSdk, FUNCTION_NAME, QUALIFIER);

    // Assert
    expect(fcSdk.removeFunctionScalingConfig).toHaveBeenCalledWith(FUNCTION_NAME, QUALIFIER);
    expect(fcSdk.getFunctionScalingConfig).toHaveBeenCalledTimes(1);
    expect(sleepMock).not.toHaveBeenCalled();
  });

  it('re-throws when removeFunctionScalingConfig fails', async () => {
    // Arrange
    const fcSdk = {
      removeFunctionScalingConfig: jest.fn().mockRejectedValue(new Error('remove failed')),
      getFunctionScalingConfig: jest.fn(),
    };

    // Act & Assert
    await expect(removeScalingConfigSDK(fcSdk, FUNCTION_NAME, QUALIFIER)).rejects.toThrow(
      'remove failed',
    );
  });
});
