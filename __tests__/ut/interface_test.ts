import {
  validateIHttpTriggerConfig,
  convertIHttpTriggerConfig,
  IHttpTriggerConfig,
  checkRegion,
  IRegion,
  RegionList,
} from '../../src/interface';
import log from '../../src/logger';
log._set(console);

describe('validateIHttpTriggerConfig', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  it('should return true if authConfig does not have blacklist and whitelist', () => {
    const data: any = {
      authConfig: {},
    };

    expect(validateIHttpTriggerConfig(data)).toBe(true);
  });

  it('should return false if authConfig has both blacklist and whitelist', () => {
    const data: any = {
      authConfig: {
        blacklist: ['abc', 'def'],
        whitelist: ['ghi', 'jkl'],
      },
    };

    const errorMock = jest.spyOn(log, 'error');

    expect(validateIHttpTriggerConfig(data)).toBe(false);
    expect(errorMock).toHaveBeenCalledWith(
      'You cannot use blacklist and whitelist together in authConfig of http trigger',
    );
  });

  it('should return true if authConfig has only blacklist', () => {
    const data: any = {
      authConfig: {
        blacklist: ['abc', 'def'],
      },
    };

    expect(validateIHttpTriggerConfig(data)).toBe(true);
  });

  it('should return true if authConfig has only whitelist', () => {
    const data: any = {
      authConfig: {
        whitelist: ['ghi', 'jkl'],
      },
    };

    expect(validateIHttpTriggerConfig(data)).toBe(true);
  });
});

describe('convertIHttpTriggerConfig', () => {
  const originalLogDebug = log.debug;
  const originalLogError = log.error;

  beforeEach(() => {
    log.error = (...args) => {
      originalLogDebug('Error:', ...args);
    };
  });

  afterEach(() => {
    log.debug = originalLogDebug;
    log.error = originalLogError;
  });

  it('should convert IHttpTriggerConfig to IHttpTriggerConfig', () => {
    const httpTriggerConfig: IHttpTriggerConfig = {
      authType: 'anonymous',
      methods: ['GET'],
    };

    const result = convertIHttpTriggerConfig(httpTriggerConfig);

    expect(result).toBe(httpTriggerConfig);
  });

  it('should convert IHttpTriggerConfig to IHttpTriggerConfig', () => {
    const httpTriggerConfig: IHttpTriggerConfig = {
      authType: 'jwt',
      methods: ['GET'],
    };
    const errorMock = jest.spyOn(log, 'error');

    const result = convertIHttpTriggerConfig(httpTriggerConfig);

    expect(result).toBe(httpTriggerConfig);
    expect(errorMock).toHaveBeenCalledWith(
      'You must set authConfig in triggerConfig when authType is jwt.',
    );
  });

  it('should httpTriggerConfig have authConfig.tokenLookup,and readPosition is header', () => {
    const httpTriggerConfig: IHttpTriggerConfig = {
      authType: 'jwt',
      methods: ['GET'],
      authConfig: {
        jwks: {
          keys: [
            {
              e: '',
              kty: '',
              alg: '',
              use: '',
              n: '',
            },
          ],
        },
        tokenLookup: [
          {
            readPosition: 'header',
            parameterName: 'name',
            prefix: 'headerPrefix',
          },
        ],
      },
    };

    const result = convertIHttpTriggerConfig(httpTriggerConfig);
    expect(result.authConfig?.tokenLookup).toBe('header:name:headerPrefix');
  });

  it('should httpTriggerConfig have authConfig.tokenLookup,and readPosition is header', () => {
    const httpTriggerConfig: IHttpTriggerConfig = {
      authType: 'jwt',
      methods: ['GET'],
      authConfig: {
        jwks: {
          keys: [
            {
              e: '',
              kty: '',
              alg: '',
              use: '',
              n: '',
            },
          ],
        },
        tokenLookup: [
          {
            readPosition: 'cookie',
            parameterName: 'name',
            prefix: 'cookiePrefix',
          },
        ],
      },
    };

    const result = convertIHttpTriggerConfig(httpTriggerConfig);
    expect(result.authConfig?.tokenLookup).toBe('cookie:name');
  });

  it('should httpTriggerConfig have authConfig.claimPassBy,and is not String', () => {
    const httpTriggerConfig: IHttpTriggerConfig = {
      authType: 'jwt',
      methods: ['GET'],
      authConfig: {
        jwks: {
          keys: [
            {
              e: '',
              kty: '',
              alg: '',
              use: '',
              n: '',
            },
          ],
        },
        tokenLookup: [
          {
            readPosition: 'cookie',
            parameterName: 'name',
            prefix: 'cookiePrefix',
          },
        ],
        claimPassBy: [
          {
            mappingParameterName: 'name2',
            mappingParameterPosition: 'header',
          },
        ],
      },
    };

    const result = convertIHttpTriggerConfig(httpTriggerConfig);

    expect(result.authConfig?.claimPassBy).toBe('header::name2');
  });
});

describe('checkRegion', () => {
  it('should Error when r is undefind', () => {
    expect(() => checkRegion('' as IRegion)).toThrow(
      'Region not specified, please specify --region',
    );
  });

  it('should throw an error if region is invalid', () => {
    expect(() => checkRegion('invalid-region' as IRegion)).toThrow(
      `Invalid region, The allowed regions are ${RegionList}`,
    );
  });

  it('should true when r is cn-hangzhou', () => {
    const result = checkRegion('cn-hangzhou');

    expect(result).toBe(true);
  });
});
