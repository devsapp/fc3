export default {
  help: {
    description: 'Function alias operation ',
    summary: 'Function alias operation ',
  },
  subCommands: {
    get: {
      help: {
        description: `Get alias details.

Examples with Yaml:
  $ s alias get --alias-name aliasName

Examples with CLI:
  $ s cli fc3 alias get --alias-name aliasName --region cn-hangzhou --function-name test -a default`,
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
        description: `View the list of function aliases.

Examples with Yaml:
  $ s alias list
  $ s alias list --table

Examples with CLI:
  $ s cli fc3 alias list --table --region cn-hangzhou --function-name test -a default`,
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
        description: `Publish function alias.

Examples with Yaml:
  $ s alias publish --alias-name aliasName --version-id latest
  $ s alias publish --alias-name aliasName --version-id 123 --description "this is description"
  $ s alias publish --alias-name aliasName --version-id 123 --vw "{\\"2\\":0.2}"

Examples with CLI:
  $ s cli fc3 alias publish --alias-name aliasName --version-id 123 --region cn-hangzhou --function-name test -a default`,
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
        description: `Remove function alias.

Examples with Yaml:
  $ s alias remove --alias-name aliasName
  $ s alias remove --alias-name aliasName -y

Examples with CLI:
  $ s cli fc3 alias remove --alias-name aliasName --region cn-hangzhou --function-name test -a default`,
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
