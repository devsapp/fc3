export default {
  help: {
    description: 'Function instance operation',
    summary: 'Function instance operation',
  },
  subCommands: {
    exec: {
      help: {
        description: `Execute a command in a instance.
Example:
  $ s3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28 --cmd "ls -lh"
  $ s3 instance exec --instance-id c-64fec1fc-27c4833c325445879a28
  $ s3 instance exec --instance-id \`s3 invoke  | grep "Invoke instanceId:" |  sed "s/.*: //"\`
  $ s3 cli fc3 instance --instance-id c-64fec1fc-27c4833c325445879a28 --region cn-hangzhou --function-name test -a default`,
        summary: 'Execute a command in a instance',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--instance-id <instanceId>', '[Required] Specify function instance id'],
          ['--cmd <cmd>', '[Optional] Command string to be executed'],
          ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
        ],
      },
    },
    list: {
      help: {
        description: `View the list of active function instance.
Example:
  $ s3 instance list
  $ s3 cli fc3 instance list --region cn-hangzhou --function-name test -a default`,
        summary: 'View the list of active function instance',
        option: [
          [
            '--region <region>',
            '[C-Required] Specify the fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
          ],
          ['--function-name <functionName>', '[C-Required] Specify function name'],
          ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
        ],
      },
    },
  },
};
