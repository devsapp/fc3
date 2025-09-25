export default {
  help: {
    description: 'Function scaling configuration operation',
    summary: 'Function scaling configuration operation',
  },
  subCommands: {
    list: {
      help: {
        description: `View the list of scaling configurations.

Examples with Yaml:
  $ s scaling list

Examples with CLI:
  $ s cli fc3 scaling list --region cn-hangzhou --function-name test -a default`,
        summary: 'View the list of scaling configurations',
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
        description: `Get scaling configuration.

Examples with Yaml:
  $ s scaling get --qualifier LATEST
  $ s scaling get --qualifier test

Examples with CLI:
  $ s cli fc3 scaling get --qualifier LATEST --region cn-hangzhou --function-name test -a default`,
        summary: 'Get scaling configuration',
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
        description: `Set scaling configuration.

Examples with Yaml:
  $ s scaling put --qualifier test --min-instances 2 --horizontal-scaling-policies '[{"name":"cpu-policy","metricType":"CPUUtilization","metricTarget":0.6,"minInstances":1,"maxInstances":10,"startTime":"2023-08-15T02:05:00.000Z","endTime":"2033-08-15T02:55:00.000Z","timeZone":"UTC"}]' --scheduled-policies '[{"name":"scheduled-policy","scheduleExpression":"cron(0 0 4 * * *)","target":5,"startTime":"2023-08-15T02:04:00.000Z","endTime":"2033-08-15T03:04:00.000Z","timeZone":"UTC"}]'

Examples with CLI:
  $ s cli fc3 scaling put --qualifier LATEST --min-instances 2 --region cn-hangzhou --function-name test -a default`,
        summary: 'Set scaling configuration',
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
          ['--min-instances <number>', '[Optional] Specify the minimum instances parameter'],
          [
            '--horizontal-scaling-policies <json>',
            '[Optional] Set the configuration details of horizontal scaling policies.',
          ],
          [
            '--scheduled-policies <json>',
            '[Optional] Set the configuration details of scheduled policies.',
          ],
          ['--resident-pool-id <id>', '[Optional] Specify the resident pool ID'],
        ],
      },
    },
    remove: {
      help: {
        description: `Delete scaling configuration.

Examples with Yaml:
  $ s scaling remove --qualifier LATEST
  $ s scaling remove --qualifier test -y

Examples with CLI:
  $ s cli fc3 scaling remove --qualifier LATEST --region cn-hangzhou --function-name test -a default`,
        summary: 'Delete scaling configuration',
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
