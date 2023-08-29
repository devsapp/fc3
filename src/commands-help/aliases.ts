export default {
  help: {
    description: 'aliases command',
  },
  subCommands: {
    get: {
      help: {
        description: 'aliases list command',
        summary: 'aliases list summary',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--alias-name <aliasName>', 'Appoint alias name'],
        ],
      },
    },
    list: {
      help: {
        description: 'aliases list command',
        summary: 'aliases list summary',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
        ],
      },
    },
    publish: {
      help: {
        description: 'aliases publish command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--alias-name <aliasName>', 'Appoint alias name'],
          ['--description <description>', 'Alias description'],
          [
            '--vw,--additionalVersionWeight <json>',
            `Grayscale version and weights, e.g.: "{\\"1\\":0.2}"`,
          ],
        ],
      },
    },
    remove: {
      help: {
        description: 'aliases publish command',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--alias-name <aliasName>', 'Appoint alias name'],
          ['-y, --yes', "Don't ask, delete directly"],
        ],
      },
    },
  },
};
