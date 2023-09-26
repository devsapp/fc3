export default {
  help: {
    description: `Deploy local resources online.

Examples:
  $ s deploy
  $ s deploy --skip-push
  $ s deploy --function code
  $ s deploy --function config
  $ s deploy --trigger triggerName
  $ s deploy --trigger triggerName1,trigggerName2`,
    summary: 'Deploy local resources online',
    option: [
      ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
      ['--skip-push', '[Optional] Specify if skip automatically pushing docker container images'],
      [
        "--function ['code'/'config']",
        "[Optional] Only deploy function configuration or code. Use 'code' to deploy function code only, use 'config' to deploy function configuration only",
      ],
      [
        '--trigger [triggerName]',
        "[Optional] Only deploy trigger only. Specify a trigger name to deploy only the specified trigger; Multiple names can be split by ','",
      ],
    ],
  },
};
