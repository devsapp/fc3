export default {
  help: {
    description: 'layer command',
    summary: 'layer command',
  },
  subCommands: {
    publish: {
      help: {
        description: 'layer publish command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    list: {
      help: {
        description: 'layer list command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    info: {
      help: {
        description: 'layer info command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    versions: {
      help: {
        description: 'layer versions command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    download: {
      help: {
        description: 'layer download command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    acl: {
      help: {
        description: 'layer acl command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
    remove: {
      help: {
        description: 'layer remove command',
        option: [['--region <region>', 'Appoint region']],
      },
    },
  },
};
