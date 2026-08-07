import { formatJsonString } from '../../../../src/subCommands/local/impl/utils';

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatJsonString', () => {
    it('should format valid JSON string', () => {
      const input = '{"key": "value", "number": 42}';
      const expected = '{"key":"value","number":42}';

      const result = formatJsonString(input);

      expect(result).toBe(expected);
    });

    it('should return original string for invalid JSON', () => {
      const input = 'invalid json';

      const result = formatJsonString(input);

      expect(result).toBe(input);
    });

    it('should handle empty string', () => {
      const input = '';

      const result = formatJsonString(input);

      expect(result).toBe(input);
    });
  });
});
