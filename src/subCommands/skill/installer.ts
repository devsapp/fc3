import * as path from 'path';
import * as os from 'os';
import fs from 'fs-extra';
import { SKILL_NAME, TOOL_DIRS, SKILLS_SUBDIR } from './constants';

export type InstallMode = 'install' | 'update';
export type InstallStatus = 'installed' | 'updated' | 'skipped' | 'overwritten';

export interface InstallResult {
  tool: string;
  scope: 'global' | 'project';
  target: string;
  status: InstallStatus;
}

/**
 * Candidate locations for the bundled skill source, in priority order:
 * 1. `<dist>/skills/<name>` — the published npm package (ncc bundle: __dirname is dist).
 * 2. repo `.agents/skills/<name>` — running from source (ts-node / jest, __dirname is src/subCommands/skill).
 * 3. cwd `.agents/skills/<name>` — last-resort fallback.
 */
export function skillSourceCandidates(): string[] {
  return [
    path.join(__dirname, SKILLS_SUBDIR, SKILL_NAME),
    path.join(__dirname, '..', '..', '..', '.agents', SKILLS_SUBDIR, SKILL_NAME),
    path.join(process.cwd(), '.agents', SKILLS_SUBDIR, SKILL_NAME),
  ];
}

/** Resolve the bundled skill source directory, or throw if none is found. */
export function resolveSkillSource(): string {
  for (const candidate of skillSourceCandidates()) {
    if (fs.existsSync(path.join(candidate, 'SKILL.md'))) {
      return candidate;
    }
  }
  throw new Error(
    `Skill source "${SKILL_NAME}" not found. Looked in:\n  ${skillSourceCandidates().join('\n  ')}`,
  );
}

/** The install root for a scope: user home for global, cwd for project. */
export function scopeRoot(scope: 'global' | 'project'): string {
  return scope === 'global' ? os.homedir() : process.cwd();
}

/** Absolute target directory where the skill will be installed for a tool + scope. */
export function targetDir(tool: string, scope: 'global' | 'project'): string {
  const toolDir = TOOL_DIRS[tool];
  if (!toolDir) {
    throw new Error(`Unsupported tool "${tool}". Supported: ${Object.keys(TOOL_DIRS).join(', ')}`);
  }
  return path.join(scopeRoot(scope), toolDir, SKILLS_SUBDIR, SKILL_NAME);
}

/**
 * Install (or update) the skill into a single tool + scope target.
 * - install: skip if the target already exists, unless `force`.
 * - update:  always overwrite an existing target.
 */
export function installOne(
  source: string,
  tool: string,
  scope: 'global' | 'project',
  mode: InstallMode,
  force: boolean,
): InstallResult {
  const target = targetDir(tool, scope);
  const exists = fs.existsSync(target);

  if (mode === 'install' && exists && !force) {
    return { tool, scope, target, status: 'skipped' };
  }

  // Replace the target atomically-ish: remove then copy, so stale files never linger.
  fs.removeSync(target);
  fs.ensureDirSync(path.dirname(target));
  fs.copySync(source, target, { dereference: true });

  let status: InstallStatus;
  if (mode === 'update') {
    status = 'updated';
  } else {
    status = exists ? 'overwritten' : 'installed';
  }
  return { tool, scope, target, status };
}
