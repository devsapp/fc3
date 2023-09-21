export default {
  help: {
    description: `Local invoke fc function.
Example:
  $ s3 local invoke -e '{"key":"val"}'
  $ s3 local invoke -f evt.json
  $ s3 local invoke -e '{"key":"val"}' -c vscode -d 3000 
  $ s3 local start`,
    summary: 'Local invoke fc function',
    option: [
      [
        '-e, --event string',
        '[Optional] Event data passed to the function during invocation (default: "")',
      ],
      [
        '-f, --event-file string',
        '[Optional] A file containing event data passed to the function during invoke',
      ],
      [
        '-c, --config [vscode/intellij]',
        '[Optional] Select which IDE to use when debugging and output related debug config tips for the IDE.value: vscode/intellij',
      ],
      [
        '-d, --debug-port number',
        '[Optional] Specify the local function container starting in debug mode, and exposing this port on localhost',
      ],
    ],
  },
};
