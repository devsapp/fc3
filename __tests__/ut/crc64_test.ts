import { calculateCRC64 } from '../../src/utils/index';

// Mock the entire crc64 module
jest.mock('crc64-ecma182.js', () => ({
  crc64File: jest.fn((filePath: string, callback: (err: Error | null, result?: string) => void) => {
    callback(null, '1234567890123456');
  }),
}));

describe('calculateCRC64', () => {
  const mockFilePath = '/tmp/test-file.txt';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate CRC64 successfully', async () => {
    const result = await calculateCRC64(mockFilePath);
    expect(result).toBe('1234567890123456');
  });
});
