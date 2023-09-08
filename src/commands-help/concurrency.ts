export default {
  help: {
    description: 'Function concurrency operation ',
    summary: 'Function concurrency operation ',
  },
  subCommands: {
    get: {
      help: {
        description: 'get function concurrency detail',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
        ],
      },
    },
    put: {
      help: {
        description: 'concurrency put command',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--reserved-concurrency <max>', '[Required] Specify reserved concurrency'],
        ],
      },
    },
    remove: {
      help: {
        description: 'remove function concurrency',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['-y, --yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
