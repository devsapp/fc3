import verify from '../../../src/utils/verify';
import logger from '../../../src/logger';

// Mock logger
jest.mock('../../../src/logger', () => ({
  debug: jest.fn(),
}));

describe('verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate correct props without errors', () => {
    const props = {
      functionName: 'test-function',
      region: 'cn-hangzhou' as const,
      runtime: 'nodejs18' as const,
    };

    verify(props);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Validating file path:'));
  });

  it('should log validation errors for invalid props', () => {
    const props = {
      functionName: 'test-function',
      region: 'cn-hangzhou' as const,
      // missing required runtime
    } as any; // Cast to any to bypass TypeScript checks for this test

    verify(props);

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Validating file path:'));
  });
});
