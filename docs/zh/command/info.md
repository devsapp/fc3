---
title: 查看函数 info
description: '查看函数 info'
position: 3
category: '其他功能'
---

# Info 命令

`info` 命令是查看函数线上资源详情的命令。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`info -h`/`info --help`命令时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s info`获取函数详情；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要根据需求，指定函数名等信息，例如`s cli fc3 info --region cn-hangzhou --function-name test-function-py36`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  region:   cn-huhehaote
  function:
    codeChecksum:     6647856715255221341
    codeSize:         230
    createdTime:      2023-09-25T03:24:28Z
    description:      hello world by serverless devs
    functionArn:      acs:fc:cn-hangzhou:143**********149:functions/start-python-9fqu
    functionId:       1039e868-dd7b-40ce-9ac1-4f04b730d16e
    functionName:     start-python-9fqu
    handler:          index.handler
    internetAccess:   true
    lastModifiedTime: 2023-09-25T03:40:27Z
    memorySize:       128
    role:
    runtime:          python3.9
    timeout:          3
```

## 权限与策略说明

使用该命令时，推荐配置系统策略：`AliyunFCReadOnlyAccess`
