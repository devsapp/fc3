export default {
  help: {
    description: `Remove resources online.

Examples with Yaml:
  $ s remove
  $ s remove -y
  $ s remove --trigger
  $ s remove --trigger triggerName
  $ s remove --trigger triggerName1,trigggerName2

Examples with CLI:
  $ s cli fc3 remove --region cn-hangzhou --function-name test -a default`,
    summary: 'Remove resources online',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
      [
        '--trigger [triggerName]',
        "[Optional] Only remove trigger only. Specify a trigger name to deploy only the specified trigger; Multiple names can be split by ','; A null value means to delete all triggers",
      ],
      ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
    ],
  },
  verify: false,
};
