export default {
  help: {
    description: 'provision command',
  },
  subCommands: {
    list: {
      help: {
        description: 'provision list command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
        ],
      },
    },
    get: {
      help: {
        description: 'provision list command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--qualifier <string>', 'Appoint qualifier'],
        ],
      },
    },
    put: {
      help: {
        description: 'provision put command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--target <max>', 'Appoint provision target'],
          ['--ac, --always-allocate-cpu', 'Appoint provision target'],
          ['--scheduled-actions <json>', 'Scheduled actions'],
          ['--target-tracking-policies <json>', 'Target tracking policies'],
          ['--qualifier <string>', 'Appoint qualifier'],
        ],
      },
    },
    remove: {
      help: {
        description: 'provision remove command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['-y, --yes', "Don't ask, delete directly"],
          ['--qualifier <string>', 'Appoint qualifier'],
        ],
      },
    },
  },
};
