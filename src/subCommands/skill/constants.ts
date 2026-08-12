/**
 * The skill bundled with this component. Lives at `.agents/skills/<SKILL_NAME>`
 * in the repo and is copied to `dist/skills/<SKILL_NAME>` at build time.
 */
export const SKILL_NAME = 's-fc3';

/**
 * Mapping from a supported tool to the directory (relative to the install root)
 * where that tool discovers skills. Every mainstream tool uses the same
 * `<toolDir>/skills/<name>/` convention, so installing is uniform.
 */
export const TOOL_DIRS: Record<string, string> = {
  claude: '.claude',
  codex: '.codex',
  cursor: '.cursor',
  qoder: '.qoder',
  agents: '.agents',
};

/** All tools targeted when the user does not pass `--tools`. */
export const ALL_TOOLS = Object.keys(TOOL_DIRS);

/** Sub-directory under each tool dir that holds skills. */
export const SKILLS_SUBDIR = 'skills';
