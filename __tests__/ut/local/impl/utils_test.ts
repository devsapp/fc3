import {
  getTimeZone,
  formatJsonString,
  downloadFile,
} from '../../../../src/subCommands/local/impl/utils';
import logger from '../../../../src/logger';
import http from 'http';
import fs from 'fs';
import { promisify } from 'util';

// Mock external dependencies
jest.mock('../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('http');
jest.mock('fs');
jest.mock('util');

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimeZone', () => {
    it('should return correct timezone string', () => {
      // Mock Date.getTimezoneOffset to return a fixed value
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = jest.fn(() => -480); // UTC+8

      const result = getTimeZone();

      expect(result).toBe('UTC+8');

      // Restore original function
      Date.prototype.getTimezoneOffset = originalGetTimezoneOffset;
    });
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

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const mockFile = {};
      const mockResponse = {};
      const mockPipeline = jest.fn().mockResolvedValue(undefined);

      (fs.createWriteStream as jest.Mock).mockReturnValue(mockFile);
      (promisify as unknown as jest.Mock).mockReturnValue(mockPipeline);
      (http.get as jest.Mock).mockResolvedValue(mockResponse);

      await downloadFile('http://example.com/file.txt', '/tmp/file.txt');

      expect(fs.createWriteStream).toHaveBeenCalledWith('/tmp/file.txt');
      expect(promisify).toHaveBeenCalled();
      expect(http.get).toHaveBeenCalledWith('http://example.com/file.txt');
      expect(mockPipeline).toHaveBeenCalledWith(mockResponse, mockFile);
      expect(logger.info).toHaveBeenCalledWith(
        'http://example.com/file.txt  ==>   /tmp/file.txt has been downloaded.',
      );
    });

    it('should handle download error', async () => {
      const mockError = new Error('Network error');
      (http.get as jest.Mock).mockRejectedValue(mockError);

      await downloadFile('http://example.com/file.txt', '/tmp/file.txt');

      expect(logger.error).toHaveBeenCalledWith(`Error downloading file: ${mockError}`);
    });
  });
});
