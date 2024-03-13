export default {
  help: {
    description: `Invoke online functions.

Examples with Yaml:
  $ s invoke -e "{\\"key\\": \\"val\\"}"
  $ s invoke -f evt.json
  $ s invoke --invocation-type Async

Examples with CLI:
  $ s cli fc3 invoke -e "payload" --region cn-huhehaote --function-name test -a default`,
    summary: 'Invoke online functions',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
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
        '[Optional] Specify Invocation type, value: Async/Async, default: Sync',
      ],
      [
        '--stateful-async-invocation-id <statefulAsyncInvocationId>',
        '[Optional] Specify The ID of the asynchronous task, only takes effect when --invocation-type=async',
      ],
    ],
  },
};
