export default {
  help: {
    description: `Synchronize online resources to offline resources.

Examples with Yaml:
  $ s sync
  $ s sync --target-dir ./test --qualifier testAlias

Examples with CLI:
  $ s cli fc3 sync --region cn-hangzhou --function-name test -a default
  $ s cli fc3 sync --region cn-hangzhou --function-name s1\\$f1 -a default`,
    summary: 'Synchronize online resources to offline resources',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
      [
        '--target-dir <target-dir>',
        '[Optional] [Optional] Specify storage directory, default directory is ./sync-clone',
      ],
      ['--qualifier <qualifier>', '[Optional] Specify version or alias, default is LATEST'],
    ],
  },
};
