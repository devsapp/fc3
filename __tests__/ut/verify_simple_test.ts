import verify from '../../src/utils/verify';
import logger from '../../src/logger';
logger._set(console);

describe('verify', () => {
  it('should not throw errors for valid props', () => {
    const props = {
      functionName: 'test-function',
      region: 'cn-hangzhou' as const,
      runtime: 'nodejs18' as const,
      handler: 'index.handler',
      code: '/code',
    };

    expect(() => verify(props)).not.toThrow();
  });
});
