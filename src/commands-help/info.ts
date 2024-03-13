export default {
  help: {
    description: `Query online resource details.

Examples with Yaml:
  $ s info

Examples with CLI:
  $ s cli fc3 info --region cn-hangzhou --function-name  test -a default`,
    summary: 'Query online resource details',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
    ],
  },
};
