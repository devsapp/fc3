export default {
  help: {
    description: 'deploy command',
    // summary: '',
    option: [
      ['-y, --yes', 'Configuring deployment using yaml'],
      ['--skip-push', 'Skip Mirror Push'],
      [
        "--function ['code'/'config']",
        "Deploy function only; Use 'code' to deploy function code only, use 'config' to deploy function configuration only",
      ],
      [
        '--trigger [triggerName]',
        "Deploy trigger only; Specify a trigger name to deploy only the specified triggerName; Multiple names can be used ',' split",
      ],
    ],
  },
};
