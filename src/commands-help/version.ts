export default {
  help: {
    description: 'version command',
  },
  subCommands: {
    list: {
      help: {
        description: 'version list command',
        summary: 'version list summary',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
        ],
      },
    },
    publish: {
      help: {
        description: 'version list command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--description', 'version description'],
        ],
      },
    },
    remove: {
      help: {
        description: 'version list command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--version-id', 'Specify versionId'],
          ['-y, --assume-yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
