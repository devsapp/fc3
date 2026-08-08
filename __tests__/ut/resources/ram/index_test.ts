import { ICredentials } from '@serverless-devs/component-interface';
import Role, { RamClient } from '../../../../src/resources/ram/index';

// Mock external SDK dependencies
jest.mock('@serverless-cd/srm-aliyun-ram20150501');
jest.mock('@alicloud/openapi-client');
jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

describe('Role', () => {
  describe('isRoleArnFormat', () => {
    it('returns true for a valid role arn', () => {
      // Arrange / Act / Assert
      expect(Role.isRoleArnFormat('acs:ram::123456789:role/my-role')).toBe(true);
    });

    it('returns false for a plain role name', () => {
      expect(Role.isRoleArnFormat('my-role')).toBe(false);
    });

    it('returns false when the account id segment is missing digits', () => {
      expect(Role.isRoleArnFormat('acs:ram:::role/my-role')).toBe(false);
    });
  });

  describe('completionArn', () => {
    it('returns the value unchanged when input is not a string', () => {
      // Arrange
      const notAString: any = { foo: 'bar' };

      // Act
      const result = Role.completionArn(notAString, 'acct-1');

      // Assert
      expect(result).toBe(notAString);
    });

    it('returns the arn unchanged when it is already in arn format', () => {
      const arn = 'acs:ram::123456789:role/existing-role';
      expect(Role.completionArn(arn, 'acct-1')).toBe(arn);
    });

    it('assembles an arn from a plain role name and account id', () => {
      expect(Role.completionArn('my-role', '123456789')).toBe('acs:ram::123456789:role/my-role');
    });
  });
});

describe('RamClient', () => {
  it('constructs without throwing given mock credentials', () => {
    // Arrange
    const credentials: ICredentials = {
      AccountID: 'test-account-id',
      AccessKeyID: 'test-access-key-id',
      AccessKeySecret: 'test-access-key-secret',
      SecurityToken: 'test-security-token',
    };

    // Act / Assert
    expect(() => new RamClient(credentials)).not.toThrow();
  });
});
