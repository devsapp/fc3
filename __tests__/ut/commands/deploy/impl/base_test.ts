import Base from '../../../../../src/subCommands/deploy/impl/base';
import { IInputs } from '../../../../../src/interface';
import FC from '../../../../../src/resources/fc';
import { getUserAgent } from '../../../../../src/utils';

jest.mock('../../../../../src/resources/fc');
jest.mock('../../../../../src/utils');

jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const FCMock = FC as unknown as jest.Mock;
const getUserAgentMock = getUserAgent as jest.Mock;

// Concrete subclass so we can instantiate the abstract Base.
class TestImpl extends Base {
  async before(): Promise<void> {
    // no-op
  }

  async run(): Promise<string> {
    return 'ran';
  }
}

describe('Base (deploy impl base)', () => {
  let mockInputs: IInputs;

  beforeEach(() => {
    getUserAgentMock.mockReturnValue('fc3-user-agent');
    mockInputs = {
      props: {
        region: 'cn-hangzhou',
        functionName: 'test-function',
        endpoint: 'https://custom.endpoint',
      },
      credential: {
        AccountID: 'test-account-id',
        AccessKeyID: 'test-access-key-id',
        AccessKeySecret: 'test-access-key-secret',
        Region: 'cn-hangzhou',
      },
      userAgent: 'caller-ua',
      args: [],
      argsObj: [],
      baseDir: '/test/base/dir',
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('constructs an FC client with region, credential and computed userAgent', () => {
    // Act
    const impl = new TestImpl(mockInputs, true);

    // Assert
    expect(getUserAgentMock).toHaveBeenCalledWith('caller-ua', 'deploy');
    expect(FCMock).toHaveBeenCalledWith('cn-hangzhou', mockInputs.credential, {
      endpoint: 'https://custom.endpoint',
      userAgent: 'fc3-user-agent',
    });
    expect(impl.fcSdk).toBeInstanceOf(FC);
    expect(impl.inputs).toBe(mockInputs);
  });

  it('stores the provided needDeploy flag', () => {
    // Act
    const implTrue = new TestImpl(mockInputs, true);
    const implFalse = new TestImpl(mockInputs, false);
    const implUndefined = new TestImpl(mockInputs, undefined);

    // Assert
    expect(implTrue.needDeploy).toBe(true);
    expect(implFalse.needDeploy).toBe(false);
    expect(implUndefined.needDeploy).toBeUndefined();
  });

  it('exposes abstract before/run implemented by the subclass', async () => {
    // Arrange
    const impl = new TestImpl(mockInputs, true);

    // Act & Assert
    await expect(impl.before()).resolves.toBeUndefined();
    await expect(impl.run()).resolves.toBe('ran');
  });

  it('throws when inputs.props is missing (region access fails)', () => {
    // Arrange
    const badInputs = { credential: {} } as any;

    // Act & Assert
    expect(() => new TestImpl(badInputs, true)).toThrow();
  });
});
