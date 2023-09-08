export default {
  help: {
    description: 'aliases command',
  },
  subCommands: {
    get: {
      help: {
        description: 'Get alias details',
        summary: 'Get alias details ',
        option: [
          ['--region <region>', '[C-Required] Specify fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--alias-name <aliasName>', '[Required] Specify alias name'],
        ],
      },
    },
    list: {
      help: {
        description: 'View the list of function aliases',
        summary: 'View the list of function aliases',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--table <table>', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    publish: {
      help: {
        description: 'Publish function alias',
        summary: 'Publish function alias',
        option: [
          ['--region <region>', '[C-Required] Specify the fc regions, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability'],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--alias-name <aliasName>', '[Required] Specify alias name'],
          ['--description <description>', '[Optional] Specify alias description'],
          [
            '--vw,--additionalVersionWeight <json>',
            `Grayscale version and weights, e.g.: "{\\"1\\":0.2}"`,
          ],
        ],
      },
    },
    remove: {
      help: {
        description: 'Remove function alias',
        summary: 'Remove function alias',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--alias-name <aliasName>', 'Appoint alias name'],
          ['-y, --yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
