export default {
  help: {
    description: 'Service version operation ',
    summary: 'Service version operation ',
  },
  subCommands: {
    list: {
      help: {
        description: `View the list of function versions.

Examples with Yaml:
  $ s version list

Examples with CLI:
  $ s cli fc3 version list --region cn-hangzhou --function-name test -a default`,
        summary: 'View the list of function versions',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
        ],
      },
    },
    publish: {
      help: {
        description: `Publish function version.

Examples with Yaml:
  $ s version publish
  $ s version publish --description "test desc"

Examples with CLI:
  $ s cli fc3 version publish --description "test desc" --region cn-hangzhou --function-name test -a default`,
        summary: 'Publish function version',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--description <description>', '[Optional] Specify version description'],
        ],
      },
    },
    remove: {
      help: {
        description: `Remove function version.

Examples with Yaml:
  $ s version remove --version-id 123
  $ s version remove --version-id 123 -y

Examples with CLI:
  $ s cli fc3 version remove --version-id 123 --region cn-hangzhou --function-name test -a default`,
        summary: 'Remove function version',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--version-id', '[Required] Specify the version-id or LATEST'],
          ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
        ],
      },
    },
  },
};
