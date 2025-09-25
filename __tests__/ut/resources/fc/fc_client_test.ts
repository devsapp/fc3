import FC_Client from '../../../../src/resources/fc/impl/client';
import { ICredentials } from '@serverless-devs/component-interface';
import log from '../../../../src/logger';
log._set(console);

describe('FC_Client', () => {
  const mockCredentials: ICredentials = {
    AccountID: 'test-account',
    AccessKeyID: 'test-access-key-id',
    AccessKeySecret: 'test-access-key-secret',
    SecurityToken: 'test-security-token',
  };
  const mockRegion = 'cn-hangzhou';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an instance of FC_Client', () => {
    const fcClient = new FC_Client(mockRegion, mockCredentials, { timeout: 10000 });
    expect(fcClient).toBeInstanceOf(FC_Client);
    expect(fcClient.region).toBe(mockRegion);
  });
});
