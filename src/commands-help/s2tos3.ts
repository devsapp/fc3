export default {
  help: {
    description: `Translate the s.yaml file with Serverless Devs 2.0 specification into s.yaml file with 3.0 specification.

Examples with CLI:
  $ s cli fc3 s2tos3 --source s.yaml --target s3.yaml`,
    summary:
      'Translate the s.yaml file with Serverless Devs 2.0 specification into s.yaml file with 3.0 specification.',
    option: [
      [
        '--source <s.yaml>',
        '[C-Required] Specify s.yaml with Serverless Devs 2.0 specification file path, Both relative paths and absolute paths can be used, default is s.yaml or s.yml.',
      ],
      [
        '--target <s.yaml>',
        '[C-Required] Specify s.yaml with Serverless Devs 3.0 specification file path, Both relative paths and absolute paths can be used.',
      ],
    ],
  },
  verify: false,
};
