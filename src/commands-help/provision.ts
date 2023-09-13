export default {
  help: {
    description: 'Function provision Operation',
    summary: 'Function provision Operation',
  },
  subCommands: {
    list: {
      help: {
        description: 'View the list of provision. \n' + 'Example: \n' + '  $ s3 provision list',
        summary: 'View the list of provision',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
        ],
      },
    },
    get: {
      help: {
        description:
          'Get provision configuration. \n' +
          'Example: \n' +
          '  $ s3 provision get --qualifier LATEST \n' +
          '  $ s3 provision get --qualifier test',
        summary: 'Get provision configuration',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          [
            '--qualifier <qualifier>',
            '[Required] Specify the qualifier parameter. Only supports LATEST and alias',
          ],
        ],
      },
    },
    put: {
      help: {
        description:
          'Set provision configuration. \n' +
          'Example: \n' +
          '  $ s3 provision put --qualifier test --target 2 \n' +
          `  $ s3 provision put --qualifier test --ac --target 2 --scheduled-actions '[{"name":"scheduled-actions","startTime":"2023-08-15T02:04:00.000Z","endTime":"2033-08-15T02:04:00.000Z","target":1,"scheduleExpression":"cron(0 0 4 * * *)"}]' --target-tracking-policies '[{"name":"target-tracking-policies","startTime":"2023-08-15T02:05:00.000Z","endTime":"2033-08-15T02:05:00.000Z","metricType":"ProvisionedConcurrencyUtilization","metricTarget":0.6,"minCapacity":1,"maxCapacity":3}]'`,
        summary: 'Set provision configuration',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--target <max>', '[Optional] Specify the provision target parameter'],
          [
            '--ac, --always-allocate-cpu',
            '[Optional] Specify if always allocate CPU resources to the provisioned instances',
          ],
          [
            '--scheduled-actions <json>',
            '[Optional] Set the configuration details of scheduled auto scaling.',
          ],
          [
            '--target-tracking-policies <json>',
            '[Optional] Set	the configuration details of metric-based auto scaling.',
          ],
          [
            '--qualifier <qualifier>',
            '[Required] Specify the qualifier parameter. Only supports LATEST and alias',
          ],
        ],
      },
    },
    remove: {
      help: {
        description:
          'Delete provision. \n' +
          'Example: \n' +
          '  $ s3 provision remove LATEST \n' +
          '  $ s3 provision remove test -y',
        summary: 'Delete provision',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/en/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          [
            '--qualifier <qualifier>',
            '[Required] Specify the qualifier parameter. Only supports LATEST and alias',
          ],
          ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
        ],
      },
    },
  },
};
