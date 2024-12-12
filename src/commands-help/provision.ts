export default {
  help: {
    description: 'Function provision Operation',
    summary: 'Function provision Operation',
  },
  subCommands: {
    list: {
      help: {
        description: `View the list of provision.

Examples with Yaml:
  $ s provision list

Examples with CLI:
  $ s cli fc3 provision list --region cn-hangzhou --function-name test -a default`,
        summary: 'View the list of provision',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
        ],
      },
    },
    get: {
      help: {
        description: `Get provision configuration.

Examples with Yaml:
  $ s provision get --qualifier LATEST
  $ s provision get --qualifier test

Examples with CLI:
  $ s cli fc3 provision get --qualifier LATEST --region cn-hangzhou --function-name test -a default`,
        summary: 'Get provision configuration',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
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
        description: `Set provision configuration.

Examples with Yaml:
  $ s provision put --qualifier test --target 2
  $ s provision put --qualifier test --ac --target 2 --scheduled-actions '[{"name":"scheduled-actions","startTime":"2023-08-15T02:04:00.000Z","endTime":"2033-08-15T03:04:00.000Z","target":1,"scheduleExpression":"cron(0 0 4 * * *)"}]' --target-tracking-policies '[{"name":"target-tracking-policies","startTime":"2023-08-15T02:05:00.000Z","endTime":"2033-08-15T02:55:00.000Z","metricType":"ProvisionedConcurrencyUtilization","metricTarget":0.6,"minCapacity":1,"maxCapacity":3}]'

Examples with CLI:
  $ s cli fc3 provision put --qualifier LATEST --target 2 --region cn-hangzhou --function-name test -a default`,
        summary: 'Set provision configuration',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          [
            '--qualifier <qualifier>',
            '[Required] Specify the qualifier parameter. Only supports LATEST and alias',
          ],
          ['--target <max>', '[Required] Specify the provision target parameter'],
          ['--default-target <max>', '[Optional] Specify the default provision target parameter'],
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
        ],
      },
    },
    remove: {
      help: {
        description: `Delete provision.

Examples with Yaml:
  $ s provision remove --qualifier LATEST
  $ s provision remove --qualifier test -y

Examples with CLI:
  $ s cli fc3 provision remove --qualifier LATEST --region cn-hangzhou --function-name test -a default`,
        summary: 'Delete provision',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
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
