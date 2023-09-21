export default {
  help: {
    description: 'Function concurrency operation ',
    summary: 'Function concurrency operation ',
  },
  subCommands: {
    get: {
      help: {
        description: `Get function concurrency detail.

Examples with Yaml:
  $ s3 concurrency get

Examples with CLI:
  $ s3 cli fc3 concurrency get --region cn-hangzhou --function-name test -a default`,
        summary: 'Get function concurrency detail',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
        ],
      },
    },
    put: {
      help: {
        description: `Put function concurrency.

Examples with Yaml:
  $ s3 concurrency put --reserved-concurrency 5

Examples with CLI:
  $ s3 cli fc3 concurrency put --reserved-concurrency 3 --region cn-hangzhou --function-name test -a default`,
        summary: 'Put function concurrency',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--reserved-concurrency <max>', '[Required] Specify reserved concurrency'],
        ],
      },
    },
    remove: {
      help: {
        description: `Remove function concurrency.

Examples with Yaml:
  $ s3 concurrency remove
  $ s3 concurrency remove -y

Examples with CLI:
  $ s3 cli fc3 concurrency remove --region cn-hangzhou --function-name test -a default`,
        summary: 'Remove function concurrency',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['-y, --assume-yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
