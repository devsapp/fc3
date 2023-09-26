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
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
    ],
  },
};
