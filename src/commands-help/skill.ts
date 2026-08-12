const toolOption = [
  '--tools <tools>',
  'Comma-separated target tools: claude,codex,cursor,qoder,agents (default: all)',
];
const globalOption = ['--global', 'Install into the user home directory (default scope)'];
const projectOption = ['--project', 'Install into the current project directory'];

export default {
  help: {
    description: 'Install or update the bundled s-fc3 skill into mainstream agent tools',
    summary: 'Install/update the s-fc3 skill',
  },
  subCommands: {
    install: {
      help: {
        description: `Install the s-fc3 skill into the target tools' skills directory.
Existing installations are skipped unless --force is passed.

Examples:
  $ s cli fc3 skill install
  $ s cli fc3 skill install --tools claude,codex
  $ s cli fc3 skill install --project
  $ s cli fc3 skill install --global --project --force`,
        summary: 'Install the s-fc3 skill (skips existing)',
        option: [
          toolOption,
          globalOption,
          projectOption,
          ['--force', 'Overwrite an existing installation'],
        ],
      },
    },
    update: {
      help: {
        description: `Update (overwrite) the s-fc3 skill in the target tools' skills directory.

Examples:
  $ s cli fc3 skill update
  $ s cli fc3 skill update --tools qoder
  $ s cli fc3 skill update --global --project`,
        summary: 'Update the s-fc3 skill (overwrites)',
        option: [toolOption, globalOption, projectOption],
      },
    },
  },
};
