export default {
  help: {
    description: `Build the dependencies.

Examples:
  $ s build
  $ s build --publish-layer
  $ s build --dockerfile ./code/Dockerfile --context ./code
  $ s build --custom-env "{\\"myenv\\": \\"test\\"}" --custom-args="-i https://pypi.tuna.tsinghua.edu.cn/simple"
  $ s build --command="pip install -t . flask -i https://pypi.tuna.tsinghua.edu.cn/simple"
  $ s build --script-file my_script.sh`,
    summary: 'Build the dependencies',
    option: [
      ['--publish-layer', '[Optional] Publishing the built artifact as a layer'],
      ['--use-sandbox', '[Optional] Enter the sandbox container of the corresponding runtime'],
      ['--custom-env <json>', '[Optional] Custom environment variables injected during build'],
      [
        '--custom-args <string>',
        '[Optional] Additional parameters when using the default build behavior, such as specifying a pypi or NPM source',
      ],
      ['--command <string>', '[Optional] Using custom commands'],
      ['--script-file <scriptFile>', '[Optional] Using custom shell scripts'],
      [
        '-f, --dockerfile <string>',
        '[Optional] Specify the dockerfile path, Use docker to build the image of the custom container runtime',
      ],
      [
        'context <string>',
        '[Optional] custom-container context directory for constructing the image',
      ],
    ],
  },
  verify: false,
};
