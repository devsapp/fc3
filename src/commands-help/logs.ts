export default {
  help: {
    description: `Query the function log. You need to open SLS log service

Examples with Yaml:
  $ s logs --tail
  $ s logs -s 2023-11-02T02:54:00+08:00 -e 2023-11-02T02:54:59+08:00


Examples with CLI:
  $ s cli fc3 logs --region cn-hangzhou --function-name functionName -s 2023-11-02T14:00:00+08:00 -e 2023-11-02T14:04:59+08:00 -a default`,
    summary: 'Query the function log',
    option: [
      [
        '--region <region>',
        '[C-Required] Specify fc region, you can see all supported regions in https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability',
      ],
      ['--function-name <functionName>', '[C-Required] Specify function name'],
      ['--request-id <requestId>', '[Optional] Query according to requestId'],
      ['--instance-id <instanceId>', '[Optional] Query according to instanceId'],
      [
        '-s, --start-time',
        '[Optional] Query log start time (timestamp or time format，like 1611827290000 or 2021-11-11T11:11:12+00:00)',
      ],
      [
        '-e, --end-time',
        '[Optional] Query log end time (timestamp or time format，like 1611827290000 or 2021-11-11T11:11:12+00:00)',
      ],
      ['--tail', '[Optional] Continuous log output mode'],
      ['--type <type>', '[Optional] Query according to Log type, value: success/fail'],
      ['--qualifier <qualifier>', '[Optional] Query according to the specified version or alias'],
      ['--match <match>', '[Optional] The matched character is highlighted'],
      [
        '--search <search>',
        '[Optional] Query according to keyword, Document: https://help.aliyun.com/document_detail/29060.html',
      ],
    ],
  },
};
