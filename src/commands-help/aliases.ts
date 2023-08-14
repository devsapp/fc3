export default {
  help: {
    description: 'version command',
  },
  subCommands: {
    get: {
      help: {
        description: 'version list command',
        summary: 'version list summary',
        option: [
          ['--region <region>', 'Appoint region'],
          ['--function-name <functionName>', 'Appoint function name'],
          ['--alias-name <aliasName>', 'Appoint alias name'],
        ],
      },
    },
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
        description: 'version publish command',
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
        description: 'version publish command',
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
