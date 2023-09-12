export default {
  help: {
    description: 'remove command',
    option: [
      ['--region <region>', 'Appoint region'],
      ['--function', 'Remove function'],
      ['--trigger <triggerName>', 'Remove appoint trigger name'],
      ['-y, --assume-yes', "Don't ask, delete directly"],
    ],
  },
};
