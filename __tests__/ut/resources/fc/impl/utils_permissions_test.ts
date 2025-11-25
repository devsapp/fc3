import { setNodeModulesBinPermissions } from '../../../../../src/resources/fc/impl/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import logger from '../../../../../src/logger';

jest.mock('../../../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
}));

describe('Windows node_modules/.bin permissions fix', () => {
  let tempDir: string;
  let originalPlatform: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
    originalPlatform = process.platform;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    Object.defineProperty(process, 'platform', { value: originalPlatform });
    (logger.debug as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
  });

  it('should set executable permissions for files in node_modules/.bin on Windows', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const binPath = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(binPath, { recursive: true });

    const testFile = path.join(binPath, 'test-script');
    fs.writeFileSync(testFile, '#!/bin/bash\necho "test"');

    const originalStat = fs.statSync(testFile);

    setNodeModulesBinPermissions(tempDir);

    const newStat = fs.statSync(testFile);
    expect(newStat.mode & 0o111).toBeGreaterThanOrEqual(originalStat.mode & 0o111);

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Set executable permission for'),
    );
  });

  it('should not run on non-Windows platforms', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    setNodeModulesBinPermissions(tempDir);

    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should handle missing node_modules/.bin directory gracefully', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    expect(() => {
      setNodeModulesBinPermissions(tempDir);
    }).not.toThrow();
  });

  it('should skip directories within node_modules/.bin', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });

    const binPath = path.join(tempDir, 'node_modules', '.bin');
    fs.mkdirSync(binPath, { recursive: true });

    const subDir = path.join(binPath, 'subdir');
    fs.mkdirSync(subDir);

    const testFile = path.join(binPath, 'test-script');
    fs.writeFileSync(testFile, '#!/bin/bash\necho "test"');

    setNodeModulesBinPermissions(tempDir);

    // Verify only the file got processed, not the directory
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Set executable permission for'),
    );
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test-script'));
  });
});
