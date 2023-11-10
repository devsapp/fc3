---
title: 函数触发 invoke
description: '函数触发 invoke'
position: 2
category: '调用&调试'
---

# Invoke 命令

`invoke` 命令是对线上函数进行调用/触发的命令。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
  - [注意事项](#注意事项)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`invoke -h`/`invoke --help`命令时，可以获取帮助文档。

### 参数解析

| 参数全称                     | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ---------------------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名                                                                                                                 |
| qualifier                    | -        | 选填            | 选填           | 指定调用的版本或者别名, 默认为 LATEST                                                                                  |
| timeout                      | -        | 选填            | 选填           | 客户端调用时间 [时间设置原理](https://github.com/devsapp/fc/issues/480)                                                |
| event                        | e        | 选填            | 选填           | 事件                                                                                                                   |
| event-file                   | f        | 选填            | 选填           | 事件文件                                                                                                               |
| invocation-type              | -        | 选填            | 选填           | 调用类型，取值范围：`async, sync`，默认：`sync`                                                                        |
| stateful-async-invocation-id | -        | 选填            | 选填           | 有状态的异步调用                                                                                                       |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s invoke`进行线上函数的调用；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名等，例如`s cli fc3 invoke -e "payload" --region cn-hangzhou --function-name start-python`

上述命令的执行结果示例：

```text
========= FC invoke Logs begin =========
FC Invoke Start RequestId: 1-650c0f0d-ae96ae24839e741e3ce1ba72
2023-09-21T09:38:21.265Z 1-650c0f0d-ae96ae24839e741e3ce1ba72 [INFO] b'test'
FC Invoke End RequestId: 1-650c0f0d-ae96ae24839e741e3ce1ba72

Duration: 1.16 ms, Billed Duration: 2 ms, Memory Size: 128 MB, Max Memory Used: 25.90 MB
========= FC invoke Logs end =========

Invoke instanceId: c-650c0ecc-bd5d91ee31ed481f962c
Code Checksum: 6647856715255221341
Qualifier: undefined
RequestId: 1-650c0f0d-ae96ae24839e741e3ce1ba72

Invoke Result:
test
```

### 注意事项

在进行调用时，如果需要指定相对应的事件，例如 oss 的事件，cdn 的事件......这些事件的格式，可以参考 [event-template](../../../src/subCommands/trigger-template/event-template/)

此时，可以利用该路径的模板（可以额外进行修改）触发函数，例如：`s invoke --event-file event-template/oss.json`

## 权限与策略说明

- 最大权限: `AliyunFCInvocationAccess` 或者 `AliyunFCFullAccess`

- 最小权限:

  ```json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:InvokeFunction",
        "Effect": "Allow",
        "Resource": [
          "acs:fc:{region}:{uid}:functions/{functionName}",
          "acs:fc:{region}:{uid}:functions/{functionName}/*"
        ]
      }
    ]
  }
  ```
