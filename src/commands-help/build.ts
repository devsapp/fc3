export default {
  help: {
    description: `Build the dependencies.
Example:
  $ s3 build
  $ s3 build --dockerfile ./code/Dockerfile --context ./code
  $ s3 build --custom-env '{"myenv": "test"}' --custom-args='-i https://pypi.tuna.tsinghua.edu.cn/simple'
  $ s3 build --command="pip install -t . flask -i https://pypi.tuna.tsinghua.edu.cn/simple"
  $ s3 build --script-file my_script.sh`,
    summary: 'Build the dependencies',
    option: [
      ['--use-sandbox', '[Optional] Enter the sandbox container of the corresponding runtime'],
      [
        '--custom-env <jsonString>',
        '[Optional] Custom environment variables injected during build',
      ],
      [
        '--custom-args <argsString>',
        '[Optional] Additional parameters when using the default build behavior, such as specifying a pypi or NPM source',
      ],
      ['--command <commandString>', '[Optional] Using custom commands'],
      ['--script-file <scriptFile>', '[Optional] Using custom shell scripts'],
      [
        '-f, --dockerfile <dockerfile>',
        '[Optional] Specify the dockerfile path, Use docker to build the image of the custom container runtime',
      ],
      ['context <dir>', '[Optional] custom-container Context for constructing the image'],
    ],
  },
};
