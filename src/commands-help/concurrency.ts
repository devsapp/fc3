export default {
  help: {
    description: 'concurrency command',
  },
  subCommands: {
    get: {
      help: {
        description: 'concurrency list command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
        ],
      },
    },
    put: {
      help: {
        description: 'concurrency put command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--reserved-concurrency <max>', 'Appoint reserved-concurrency'],
        ],
      },
    },
    remove: {
      help: {
        description: 'concurrency remove command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['-y, --yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
