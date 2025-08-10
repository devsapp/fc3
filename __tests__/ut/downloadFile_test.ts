import { downloadFile } from '../../src/utils/index';
import axios from 'axios';
import * as fs from 'fs';
import { Readable, Writable } from 'stream';

// Mock axios and fs
jest.mock('axios');
jest.mock('fs');

describe('downloadFile', () => {
  const mockUrl = 'https://example.com/file.zip';
  const mockFilePath = '/tmp/test-file.zip';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should download file successfully', async () => {
    // Create a mock readable stream
    const mockStream = new Readable({
      read() {
        this.push('test data');
        this.push(null); // End the stream
      },
    });

    // Mock axios response
    (axios as jest.MockedFunction<typeof axios>).mockResolvedValue({
      data: mockStream,
    } as any);

    // Create a mock writable stream
    let finishCallback: Function | null = null;
    const mockWriteStream = new Writable({
      write(chunk: any, encoding: any, callback: any) {
        callback();
      },
    });

    // Override the on method to capture the finish callback
    const originalOn = mockWriteStream.on.bind(mockWriteStream);
    mockWriteStream.on = jest.fn((event: string, handler: Function) => {
      if (event === 'finish') {
        finishCallback = handler;
      }
      return originalOn(event, handler);
    });

    (fs.createWriteStream as jest.MockedFunction<typeof fs.createWriteStream>).mockReturnValue(
      mockWriteStream as any,
    );

    // Start the download
    const downloadPromise = downloadFile(mockUrl, mockFilePath);

    // Simulate the finish event
    setTimeout(() => {
      if (finishCallback) {
        finishCallback();
      }
    }, 10);

    // Wait for the download to complete
    await expect(downloadPromise).resolves.toBeUndefined();

    // Verify axios was called correctly
    expect(axios).toHaveBeenCalledWith({
      url: mockUrl,
      method: 'GET',
      responseType: 'stream',
    });

    // Verify createWriteStream was called
    expect(fs.createWriteStream).toHaveBeenCalledWith(mockFilePath);
  });

  it('should throw error when download fails', async () => {
    const errorMessage = 'Network error';
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValue(new Error(errorMessage));

    await expect(downloadFile(mockUrl, mockFilePath)).rejects.toThrow(errorMessage);
  });
});
