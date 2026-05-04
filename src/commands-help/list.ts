export default {
  help: {
    description: `List all functions.
Example:
  $ s list
  $ s list --prefix test --table
  $ s cli fc3 list --prefix test --limit 20 --next-token xxx --region cn-hangzhou -a default`,
    summary: 'List all functions',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify the fc region, you can see all supported regions in https://help.aliyun.com/document_detail/2512917.html',
      ],
      ['--prefix <prefix>', '[Optional] Specify the prefix of function name'],
      [
        '--limit <limit>',
        '[Optional] Specify the max number of functions to return per page, if not specified, all functions will be listed',
      ],
      [
        '--next-token <nextToken>',
        '[Optional] Specify the next token for pagination, only works with --limit',
      ],
      ['--table', '[Optional] Specify if output the result as table format'],
    ],
  },
};
