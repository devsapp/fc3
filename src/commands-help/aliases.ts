export default {
  help: {
    description: 'version command',
  },
  subCommands: {
    list: {
      help: {
        description: 'version list command',
        summary: 'version list summary',
      },
    },
    publish: {
      help: {
        description: 'version list command',
        option: [['--description', 'version description']],
      },
    },
    remove: {
      help: {
        description: 'version list command',
        option: [['--version-id', 'Specify versionId']],
      },
    },
  },
};
