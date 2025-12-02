export default {
  help: {
    description: 'Function instance operation',
    summary: 'Function instance operation',
  },
  subCommands: {
    exec: {
      help: {
        description: `Execute a command in a instance.
Examples with Yaml:
  $ s instance exec --instance-id c-6******-27c4833c325445879a28 --cmd "ls -lh"
  $ s instance exec --instance-id c-6******-27c4833c325445879a28
  $ s instance exec --instance-id c-6******-27c4833c325445879a28 --shell /bin/sh
  $ s instance exec --instance-id c-6******-27c4833c325445879a28 --workdir /app
  $ s instance exec --instance-id c-6******-27c4833c325445879a28 --no-workdir
  $ s instance exec --instance-id \`s invoke  | grep "Invoke instanceId:" |  sed "s/.*: //"\`

Examples with CLI:
  $ s cli fc3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --region cn-hangzhou --function-name test -a default
  $ s cli fc3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --region cn-hangzhou --function-name test --shell /bin/sh -a default
  $ s cli fc3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --region cn-hangzhou --function-name test --workdir / -a default
  $ s cli fc3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --region cn-hangzhou --function-name test --no-workdir -a default`,
        summary: 'Execute a command in a instance',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--instance-id <instanceId>', '[Required] Specify function instance id'],
          ['--cmd <cmd>', '[Optional] Command string to be executed'],
          [
            '--shell <shell>',
            '[Optional] Specify shell to use (e.g., /bin/sh, /bin/bash), default is bash',
          ],
          [
            '--workdir <workdir>',
            '[Optional] Specify initial working directory (e.g., /, /app). If not specified, defaults to /code or / as fallback',
          ],
          [
            '--no-workdir',
            '[Optional] Do not cd to any directory, use container\'s default WORKDIR. Same as --workdir ""',
          ],
          ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
        ],
      },
    },
    list: {
      help: {
        description: `View the list of active function instance.
Example:
  $ s instance list
  $ s cli fc3 instance list --region cn-hangzhou --function-name test -a default`,
        summary: 'View the list of active function instance',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
        ],
      },
    },
  },
  verify: false,
};
