export default {
  help: {
    description: 'Service version operation ',
    summary: 'Service version operation ',
  },
  subCommands: {
    list: {
      help: {
        description:
          'View the list of function versions. \n' + 'Example: \n' + '  $ s3 version list',
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
        description:
          'Publish function version. \n' +
          'Example: \n' +
          '  $ s3 publish \n' +
          '  $ s3 publish --description test',
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
        description:
          'Remove function version. \n' +
          'Example: \n' +
          '  $ s3 remove --version-id 123 \n' +
          '  $ s3 remove --version-id 123 -y',
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
