import { transformCustomDomainProps } from '../../../src/utils/index';
import log from '../../../src/logger';
log._set(console);

describe('transformCustomDomainProps', () => {
  it('should transform custom domain props correctly', () => {
    const local = {
      domainName: 'example.com',
      protocol: 'HTTP',
      certConfig: { certId: 'cert-123' },
      tlsConfig: { minVersion: 'TLSv1.2' },
      authConfig: { authType: 'anonymous' },
      wafConfig: { enable: true },
      route: {
        path: '/api/*',
        serviceName: 'my-service',
      },
    };

    const region = 'cn-hangzhou';
    const functionName = 'my-function';

    const result = transformCustomDomainProps(local, region, functionName);

    expect(result).toEqual({
      region,
      domainName: 'example.com',
      protocol: 'HTTP',
      certConfig: { certId: 'cert-123' },
      tlsConfig: { minVersion: 'TLSv1.2' },
      authConfig: { authType: 'anonymous' },
      wafConfig: { enable: true },
      routeConfig: {
        routes: [
          {
            path: '/api/*',
            serviceName: 'my-service',
            functionName,
          },
        ],
      },
    });
  });

  it('should handle empty route', () => {
    const local = {
      domainName: 'example.com',
      protocol: 'HTTP',
      route: {},
    };

    const region = 'cn-hangzhou';
    const functionName = 'my-function';

    const result = transformCustomDomainProps(local, region, functionName);

    expect(result.routeConfig.routes[0]).toEqual({
      functionName,
    });
  });

  it('should filter out undefined values', () => {
    const local = {
      domainName: 'example.com',
      protocol: 'HTTP',
      certConfig: undefined,
      route: {
        path: '/api/*',
      },
    };

    const region = 'cn-hangzhou';
    const functionName = 'my-function';

    const result = transformCustomDomainProps(local, region, functionName);

    expect(result).not.toHaveProperty('certConfig');
    expect(result.routeConfig.routes[0]).toEqual({
      path: '/api/*',
      functionName,
    });
  });
});
