export default {
  help: {
    description: `Invoke online functions.

Examples with Yaml:
  $ s3 invoke -e \'{"key": "val"}
  $ s3 invoke -f evt.json
  $ s3 invoke ---invocation-type async

Examples with CLI:
  $ s3 cli fc3 invoke -e "payload" --region cn-huhehaote --function-name test -a default`,
    summary: 'Invoke online functions',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
      ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
      ['--timeout <timeout>', '[Optional] Specify client timeout'],
      [
        '-e, --event <event>',
        '[Optional] Specify event data passed to the function during invocation (default: "") ',
      ],
      [
        '-f, --event-file <eventFile>',
        '[Optional] Specify event file: A file containing event data passed to the function during invoke',
      ],
      [
        '--invocation-type <invocationType>',
        '[Optional] Specify Invocation type, value: async/sync, default: sync',
      ],
      [
        '--stateful-async-invocation-id <statefulAsyncInvocationId>',
        '[Optional] Specify The ID of the asynchronous task, only takes effect when --invocation-type=async',
      ],
    ],
  },
};
