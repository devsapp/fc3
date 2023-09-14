export default {
  help: {
    description: 'Function alias operation ',
    summary: 'Function alias operation ',
  },
  subCommands: {
    get: {
      help: {
        description:
          'Get alias details. \n' + 'Example: \n' + '  $ s3 alias get --alias-name testName',
        summary: 'Get alias details ',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--alias-name <aliasName>', '[Required] Specify alias name'],
        ],
      },
    },
    list: {
      help: {
        description:
          'View the list of function aliases. \n' +
          'Example: \n' +
          '  $ s3 alias list \n' +
          '  $ s3 alias list --table',
        summary: 'View the list of function aliases',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--table', '[Optional] Specify if output the result as table format'],
        ],
      },
    },
    publish: {
      help: {
        description:
          'Publish function alias. \n' +
          'Example: \n' +
          '  $ s3 alias publish --alias-name aliasName --version-id latest\n' +
          '  $ s3 alias publish --alias-name aliasName --version-id 123 --description "this is description"\n' +
          '  $ s3 alias publish --alias-name aliasName --version-id 123 --vw "{\\"2\\":0.2}"',
        summary: 'Publish function alias',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--alias-name <aliasName>', '[Required] Specify alias name'],
          ['--version-id <versionId>', '[Required] Specify version id of the function'],
          ['--description <description>', '[Optional] Specify alias description'],
          [
            '--vw,--additionalVersionWeight <json>',
            `[Optional] Specify grayscale version and weights, e.g.: "{\\"2\\":0.2}"`,
          ],
        ],
      },
    },
    remove: {
      help: {
        description:
          'Remove function alias. \n' +
          'Example: \n' +
          '  $ s3 alias remove --alias-name aliasName \n' +
          '  $ s3 alias remove --alias-name aliasName -y',
        summary: 'Remove function alias',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--alias-name <aliasName>', '[Required] Specify alias name'],
          ['-y, --assume-yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
