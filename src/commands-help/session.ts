export default {
  help: {
    description: 'Function session operation',
    summary: 'Function session operation',
  },
  subCommands: {
    list: {
      help: {
        description: `View the list of sessions.

Examples with CLI:
  $ s cli fc3 session list --region cn-hangzhou --function-name my-function -a default`,
        summary: 'List sessions',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--limit <number>', '[Optional] The maximum number of sessions to return'],
          ['--next-token <token>', '[Optional] The token to get the next page of sessions'],
          ['--qualifier <qualifier>', '[Optional] Specify the qualifier parameter'],
          ['--session-id <sessionId>', '[Optional] Filter by session id'],
          ['--session-status <sessionStatus>', '[Optional] Filter by session status'],
        ],
      },
    },
    get: {
      help: {
        description: `Get session details.

Examples with CLI:
  $ s cli fc3 session get --region cn-hangzhou --function-name my-function --session-id session-123 --qualifier LATEST -a default`,
        summary: 'Get session details',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--session-id <sessionId>', '[Required] Specify session id'],
          ['--qualifier <qualifier>', '[Required] Specify the qualifier parameter'],
        ],
      },
    },
    create: {
      help: {
        description: `Create a new session.

Examples with CLI:
  $ s cli fc3 session create --region cn-hangzhou --function-name my-function --qualifier LATEST --session-ttl-in-seconds 600 -a default
  $ s cli fc3 session create --region cn-hangzhou --function-name my-function --qualifier LATEST --nas-config '{"userId": 1000, "groupId": 1000, "mountPoints": [{"serverAddr": "example.nas.aliyuncs.com:/", "mountDir": "/mnt/nas", "enableTLS": true}]}' -a default`,

        summary: 'Create a new session',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--qualifier <qualifier>', '[Required] Specify the qualifier parameter'],
          [
            '--st, --session-ttl-in-seconds <seconds>',
            '[Optional] Session TTL in seconds, between 0 and 21600, default 21600',
          ],
          [
            '--si, --session-idle-timeout-in-seconds <seconds>',
            '[Optional] Session idle timeout in seconds, between 0 and 21600, default 1800',
          ],
          ['--nas-config <json>', '[Optional] Set the nasConfig.'],
        ],
      },
    },
    remove: {
      help: {
        description: `Remove a session.

Examples with CLI:
  $ s cli fc3 session remove --region cn-hangzhou --function-name my-function --session-id session-123 --qualifier LATEST -a default
  $ s cli fc3 session remove --region cn-hangzhou --function-name my-function --session-id session-123 --qualifier LATEST -y -a default`,
        summary: 'Remove a session',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--session-id <sessionId>', '[Required] Specify session id'],
          ['--qualifier <qualifier>', '[Required] Specify the qualifier parameter'],
          ['-y, --assume-yes', "[Optional] Don't ask, delete directly"],
        ],
      },
    },
    update: {
      help: {
        description: `Update a session.

Examples with CLI:
  $ s cli fc3 session update --region cn-hangzhou --function-name my-function --session-id session-123 --qualifier LATEST --session-ttl-in-seconds 900 -a default`,
        summary: 'Update a session',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--session-id <sessionId>', '[Required] Specify session id'],
          ['--qualifier <qualifier>', '[Required] Specify the qualifier parameter'],
          [
            '--st, --session-ttl-in-seconds <seconds>',
            '[Optional] Session TTL in seconds, between 0 and 21600',
          ],
          [
            '--si, --session-idle-timeout-in-seconds <seconds>',
            '[Optional] Session idle timeout in seconds, between 0 and 21600',
          ],
        ],
      },
    },
  },
};
