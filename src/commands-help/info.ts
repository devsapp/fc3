export default {
  help: {
    description: 'Query online resource details. \n' + 'Example: \n' + '  $ s3 info',
    summary: 'Query online resource details ',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
    ],
  },
};
