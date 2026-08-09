import * as path from 'path';
import * as os from 'os';
import fs from 'fs-extra';
import Skill from '../../../../src/subCommands/skill';
import {
  resolveSkillSource,
  targetDir,
  installOne,
} from '../../../../src/subCommands/skill/installer';
import { ALL_TOOLS, TOOL_DIRS, SKILL_NAME } from '../../../../src/subCommands/skill/constants';

jest.mock('../../../../src/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// os.homedir is non-configurable for spyOn, so mock the module (keeping tmpdir real).
jest.mock('os', () => {
  const actual = jest.requireActual('os');
  return { ...actual, homedir: jest.fn(() => actual.homedir()) };
});

// Isolated fake home + project roots so tests never touch the real ~/.claude etc.
let homeRoot: string;
let projectRoot: string;

beforeEach(() => {
  homeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fc3-skill-home-'));
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fc3-skill-proj-'));
  (os.homedir as jest.Mock).mockReturnValue(homeRoot);
  jest.spyOn(process, 'cwd').mockReturnValue(projectRoot);
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.removeSync(homeRoot);
  fs.removeSync(projectRoot);
});

const inputs = (args: string[]) => ({ args } as any);

describe('installer', () => {
  test('resolveSkillSource finds a directory containing SKILL.md', () => {
    // process.cwd is mocked, but the repo .agents source resolves via __dirname candidate.
    jest.spyOn(process, 'cwd').mockRestore();
    const source = resolveSkillSource();
    expect(fs.existsSync(path.join(source, 'SKILL.md'))).toBe(true);
  });

  test('targetDir builds <root>/<toolDir>/skills/<name> for every tool', () => {
    for (const tool of ALL_TOOLS) {
      expect(targetDir(tool, 'global')).toBe(
        path.join(homeRoot, TOOL_DIRS[tool], 'skills', SKILL_NAME),
      );
      expect(targetDir(tool, 'project')).toBe(
        path.join(projectRoot, TOOL_DIRS[tool], 'skills', SKILL_NAME),
      );
    }
  });

  test('targetDir throws on an unknown tool', () => {
    expect(() => targetDir('nope', 'global')).toThrow(/Unsupported tool/);
  });

  describe('installOne', () => {
    let source: string;
    beforeEach(() => {
      source = fs.mkdtempSync(path.join(os.tmpdir(), 'fc3-skill-src-'));
      fs.writeFileSync(path.join(source, 'SKILL.md'), '# s-fc3\n');
    });
    afterEach(() => fs.removeSync(source));

    test('install into an empty target reports "installed" and copies files', () => {
      const result = installOne(source, 'claude', 'global', 'install', false);
      expect(result.status).toBe('installed');
      expect(fs.existsSync(path.join(result.target, 'SKILL.md'))).toBe(true);
    });

    test('install skips an existing target without force', () => {
      installOne(source, 'claude', 'global', 'install', false);
      // mutate the installed copy so we can detect a (non-)overwrite
      const marker = path.join(targetDir('claude', 'global'), 'MARKER');
      fs.writeFileSync(marker, 'keep');

      const result = installOne(source, 'claude', 'global', 'install', false);
      expect(result.status).toBe('skipped');
      expect(fs.existsSync(marker)).toBe(true);
    });

    test('install with force overwrites and reports "overwritten"', () => {
      installOne(source, 'claude', 'global', 'install', false);
      const marker = path.join(targetDir('claude', 'global'), 'MARKER');
      fs.writeFileSync(marker, 'stale');

      const result = installOne(source, 'claude', 'global', 'install', true);
      expect(result.status).toBe('overwritten');
      expect(fs.existsSync(marker)).toBe(false); // stale file cleaned up
      expect(fs.existsSync(path.join(result.target, 'SKILL.md'))).toBe(true);
    });

    test('update overwrites an existing target and reports "updated"', () => {
      installOne(source, 'qoder', 'project', 'install', false);
      const result = installOne(source, 'qoder', 'project', 'update', false);
      expect(result.status).toBe('updated');
    });
  });
});

describe('Skill command', () => {
  test('throws on missing/unknown subcommand', () => {
    expect(() => new Skill(inputs([]))).toThrow(/not found/);
    expect(() => new Skill(inputs(['bogus']))).toThrow(/not found/);
  });

  test('throws on unknown --tools value', () => {
    expect(() => new Skill(inputs(['install', '--tools', 'claude,unknown']))).toThrow(
      /Unknown tool/,
    );
  });

  test('install (default) targets all tools in the global scope', async () => {
    const results = await new Skill(inputs(['install'])).install();
    expect(results).toHaveLength(ALL_TOOLS.length);
    expect(results.every((r) => r.scope === 'global')).toBe(true);
    expect(results.every((r) => r.status === 'installed')).toBe(true);
    for (const tool of ALL_TOOLS) {
      expect(
        fs.existsSync(path.join(homeRoot, TOOL_DIRS[tool], 'skills', SKILL_NAME, 'SKILL.md')),
      ).toBe(true);
    }
  });

  test('install with --tools filter installs only those tools', async () => {
    const results = await new Skill(inputs(['install', '--tools', 'claude,codex'])).install();
    expect(results.map((r) => r.tool).sort()).toEqual(['claude', 'codex']);
  });

  test('install then install again skips (idempotent without force)', async () => {
    await new Skill(inputs(['install', '--tools', 'cursor'])).install();
    const again = await new Skill(inputs(['install', '--tools', 'cursor'])).install();
    expect(again[0].status).toBe('skipped');
  });

  test('update overwrites existing installations', async () => {
    await new Skill(inputs(['install', '--tools', 'cursor'])).install();
    const results = await new Skill(inputs(['update', '--tools', 'cursor'])).update();
    expect(results[0].status).toBe('updated');
  });

  test('--global --project installs into both scopes', async () => {
    const results = await new Skill(
      inputs(['install', '--tools', 'agents', '--global', '--project']),
    ).install();
    expect(results.map((r) => r.scope).sort()).toEqual(['global', 'project']);
    expect(fs.existsSync(path.join(homeRoot, '.agents', 'skills', SKILL_NAME, 'SKILL.md'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(projectRoot, '.agents', 'skills', SKILL_NAME, 'SKILL.md'))).toBe(
      true,
    );
  });
});
