import { spawn } from 'child_process';
import runCommand from '../../../src/utils/run-command';
import logger from '../../../src/logger';

jest.mock('child_process');

jest.mock('../../../src/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  spin: jest.fn(),
  append: jest.fn(),
}));

const spawnMock = spawn as unknown as jest.Mock;

interface FakeProcess {
  stdout: { on: jest.Mock };
  stderr: { on: jest.Mock };
  on: jest.Mock;
  emitStdout: (data: string) => void;
  emitStderr: (data: string) => void;
  close: (code: number) => void;
}

function createFakeProcess(): FakeProcess {
  const stdoutHandlers: Record<string, (data: string) => void> = {};
  const stderrHandlers: Record<string, (data: string) => void> = {};
  const procHandlers: Record<string, (code: number) => void> = {};

  return {
    stdout: {
      on: jest.fn((event: string, cb: (data: string) => void) => {
        stdoutHandlers[event] = cb;
      }),
    },
    stderr: {
      on: jest.fn((event: string, cb: (data: string) => void) => {
        stderrHandlers[event] = cb;
      }),
    },
    on: jest.fn((event: string, cb: (code: number) => void) => {
      procHandlers[event] = cb;
    }),
    emitStdout: (data: string) => stdoutHandlers['data'] && stdoutHandlers['data'](data),
    emitStderr: (data: string) => stderrHandlers['data'] && stderrHandlers['data'](data),
    close: (code: number) => procHandlers['close'] && procHandlers['close'](code),
  };
}

describe('runCommand', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  it('exposes showStdout enum', () => {
    // Assert
    expect(runCommand.showStdout).toEqual({
      inherit: 'inherit',
      pipe: 'pipe',
      ignore: 'ignore',
    });
  });

  it('resolves when process closes with code 0', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('echo hello', runCommand.showStdout.inherit);
    fake.close(0);

    // Assert
    await expect(promise).resolves.toBeUndefined();
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it('rejects with "command failed with code N" when close code is non-zero', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('bad command', runCommand.showStdout.inherit);
    fake.close(2);

    // Assert
    await expect(promise).rejects.toThrow('command failed with code 2');
  });

  it('forwards stdout and stderr data to logger.append in pipe mode', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('run something', runCommand.showStdout.pipe);
    fake.emitStdout('stdout-line');
    fake.emitStderr('stderr-line');
    fake.close(0);
    await promise;

    // Assert
    expect(logger.append).toHaveBeenCalledWith('stdout-line');
    expect(logger.append).toHaveBeenCalledWith('stderr-line');
  });

  it('does not register stdout/stderr listeners when not in pipe mode', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('run something', runCommand.showStdout.inherit);
    fake.close(0);
    await promise;

    // Assert
    expect(fake.stdout.on).not.toHaveBeenCalled();
    expect(fake.stderr.on).not.toHaveBeenCalled();
    expect(logger.append).not.toHaveBeenCalled();
  });

  it('passes shellScript as an extra argument and forwards cwd to spawn options', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('bash', runCommand.showStdout.pipe, 'script.sh', '/work/dir');
    fake.close(0);
    await promise;

    // Assert
    expect(spawnMock).toHaveBeenCalledWith(
      'bash',
      ['script.sh'],
      expect.objectContaining({ shell: true, stdio: 'pipe', cwd: '/work/dir' }),
    );
  });

  it('merges env-style prefix into the command name', async () => {
    // Arrange
    const fake = createFakeProcess();
    spawnMock.mockReturnValue(fake);

    // Act
    const promise = runCommand('KEY=val node app.js', runCommand.showStdout.inherit);
    fake.close(0);
    await promise;

    // Assert
    expect(spawnMock).toHaveBeenCalledWith(
      'KEY=val node',
      ['app.js'],
      expect.objectContaining({ shell: true, stdio: 'inherit' }),
    );
  });
});
