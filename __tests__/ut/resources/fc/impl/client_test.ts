import FC_Client, { fc2Client } from '../../../../../src/resources/fc/impl/client';
import { ICredentials } from '@serverless-devs/component-interface';
import { Config } from '@alicloud/openapi-client';
import FC2 from '@alicloud/fc2';
import { IRegion } from '../../../../../src/interface';
import * as utils from '../../../../../src/resources/fc/impl/utils';
import _ from 'lodash';

// Mock external dependencies
jest.mock('@alicloud/openapi-client');
jest.mock('@alicloud/fc2');
jest.mock('../../../../../src/resources/fc/impl/utils', () => ({
  ...jest.requireActual('../../../../../src/resources/fc/impl/utils'),
  getCustomEndpoint: jest.fn(),
  isCustomContainerRuntime: jest.fn((runtime) => runtime === 'custom-container'),
  isCustomRuntime: jest.fn(
    (runtime) =>
      runtime === 'custom' ||
      runtime === 'custom.debian10' ||
      runtime === 'custom.debian11' ||
      runtime === 'custom.debian12',
  ),
}));
jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('FC_Client', () => {
  let mockCredentials: ICredentials;
  let mockRegion: IRegion;
  let mockOptions: any;

  beforeEach(() => {
    mockCredentials = {
      AccountID: 'test-account-id',
      AccessKeyID: 'test-access-key-id',
      AccessKeySecret: 'test-access-key-secret',
      SecurityToken: 'test-security-token',
    } as ICredentials;

    mockRegion = 'cn-hangzhou';
    mockOptions = {
      timeout: 30000,
      endpoint: 'https://test-endpoint.com',
      userAgent: 'test-user-agent',
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('fc2Client', () => {
    it('should create FC2 client with correct configuration', () => {
      const mockEndpoint = 'https://test-endpoint.com';
      (utils.getCustomEndpoint as jest.Mock).mockReturnValue({ endpoint: mockEndpoint });

      fc2Client(mockRegion, mockCredentials, 'https://test-endpoint.com');

      expect(FC2).toHaveBeenCalledWith('test-account-id', {
        accessKeyID: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        securityToken: 'test-security-token',
        region: 'cn-hangzhou',
        endpoint: mockEndpoint,
        secure: true,
        timeout: 60000,
      });
    });

    it('should use default endpoint when custom endpoint is not provided', () => {
      (utils.getCustomEndpoint as jest.Mock).mockReturnValue({ endpoint: undefined });

      fc2Client(mockRegion, mockCredentials, undefined);

      expect(FC2).toHaveBeenCalledWith('test-account-id', {
        accessKeyID: 'test-access-key-id',
        accessKeySecret: 'test-access-key-secret',
        securityToken: 'test-security-token',
        region: 'cn-hangzhou',
        endpoint: undefined,
        secure: true,
        timeout: 60000,
      });
    });
  });

  describe('constructor', () => {
    it('should create FC_Client instance with correct configuration', () => {
      const mockEndpoint = 'https://test-endpoint.com';
      (utils.getCustomEndpoint as jest.Mock).mockReturnValue({
        protocol: 'https',
        host: mockEndpoint,
        endpoint: `https://${mockEndpoint}`,
      });

      const mockConfigInstance = {};
      (Config as any).mockImplementation(() => mockConfigInstance);

      const client = new FC_Client(mockRegion, mockCredentials, mockOptions);

      expect(client.region).toBe(mockRegion);
      expect(client.credentials).toBe(mockCredentials);
      expect(client.customEndpoint).toBe(mockEndpoint);
      expect(Config).toHaveBeenCalledTimes(2); // Two clients created
      expect(FC2).not.toHaveBeenCalled(); // FC2 client is created on demand
    });

    it('should use default endpoints when no custom endpoint is provided', () => {
      const mockOptionsWithoutEndpoint = { ...mockOptions, endpoint: undefined };
      (utils.getCustomEndpoint as jest.Mock).mockReturnValue({ protocol: 'https' });

      const mockConfigInstance = {};
      (Config as any).mockImplementation(() => mockConfigInstance);

      const client = new FC_Client(mockRegion, mockCredentials, mockOptionsWithoutEndpoint);

      expect(client.customEndpoint).toBeUndefined();
      expect(utils.getCustomEndpoint).toHaveBeenCalledWith(undefined);
    });

    it('should handle cn-heyuan-acdr-1 region correctly', () => {
      const heyuanRegion = 'cn-heyuan-acdr-1';
      const mockOptionsWithoutEndpoint = { ...mockOptions, endpoint: undefined };
      (utils.getCustomEndpoint as jest.Mock).mockReturnValue({ protocol: 'https' });

      const mockConfigInstance = {};
      (Config as any).mockImplementation(() => mockConfigInstance);

      new FC_Client(heyuanRegion, mockCredentials, mockOptionsWithoutEndpoint);

      expect(utils.getCustomEndpoint).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getCustomEndpoint', () => {
    it('should return protocol only when no custom endpoint is provided', () => {
      const result = utils.getCustomEndpoint(undefined);
      expect(result).toEqual({ protocol: 'https' });
    });

    it('should handle http:// custom endpoint', () => {
      const result = utils.getCustomEndpoint('http://test.com');
      expect(result).toEqual({
        protocol: 'https',
      });
    });

    it('should handle https:// custom endpoint', () => {
      const result = utils.getCustomEndpoint('https://test.com');
      expect(result).toEqual({
        protocol: 'https',
      });
    });

    it('should handle custom endpoint without protocol', () => {
      const result = utils.getCustomEndpoint('test.com');
      expect(result).toEqual({
        protocol: 'https',
      });
    });
  });

  describe('isCustomContainerRuntime', () => {
    it('should return true for custom-container runtime', () => {
      const result = utils.isCustomContainerRuntime('custom-container');
      expect(result).toBe(true);
    });

    it('should return false for non custom-container runtime', () => {
      const result = utils.isCustomContainerRuntime('nodejs18');
      expect(result).toBe(false);
    });
  });

  describe('isCustomRuntime', () => {
    it('should return true for custom runtime', () => {
      const result = utils.isCustomRuntime('custom');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian10 runtime', () => {
      const result = utils.isCustomRuntime('custom.debian10');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian11 runtime', () => {
      const result = utils.isCustomRuntime('custom.debian11');
      expect(result).toBe(true);
    });

    it('should return true for custom.debian12 runtime', () => {
      const result = utils.isCustomRuntime('custom.debian12');
      expect(result).toBe(true);
    });

    it('should return false for non-custom runtime', () => {
      const result = utils.isCustomRuntime('nodejs18');
      expect(result).toBe(false);
    });
  });
});
