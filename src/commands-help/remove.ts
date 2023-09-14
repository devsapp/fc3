export default {
  help: {
    description:
      'Remove resources online. \n' +
      'Example: \n' +
      '  $ s3 remove \n' +
      '  $ s3 remove -y \n' +
      '  $ s3 remove --trigger \n' +
      '  $ s3 remove --trigger triggerName \n' +
      '  $ s3 remove --trigger triggerName1,trigggerName2',
    summary: 'Remove resources online',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
      [
        '--trigger [triggerName]',
        "[Optional] Only remove trigger only. Specify a trigger name to deploy only the specified trigger; Multiple names can be split by ','; A null value means to delete all triggers",
      ],
      ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
    ],
  },
};
