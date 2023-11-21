---
title: 函数资源配额 concurrency
description: '函数资源配额 concurrency'
position: 4
category: '发布&配置'
---

# Concurrency 命令

`concurrency` 命令是对函数资源配额 concurrency 操作的命令。

- [命令解析](#命令解析)
- [concurrency get 命令](#concurrency-get-命令)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [concurrency put 命令](#concurrency-put-命令)
  - [参数解析](#参数解析-1)
  - [操作案例](#操作案例-1)
- [concurrency remove 命令](#concurrency-remove-命令)

  - [参数解析](#参数解析-2)
  - [操作案例](#操作案例-2)

- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`concurrency -h`/`concurrency --help`时，可以获取帮助文档。

在该命令中，包括了三个子命令：

- [get：查看函数资源配额 concurrency 详情](#concurrency-get-命令)
- [put：设置函数资源配额 concurrency](#concurrency-put-命令)
- [remove：删除函数资源配额 concurrency](#concurrency-remove-命令)

## concurrency get 命令

`concurrency get` 命令，是获取函数资源配 concurrency 详情的命令。

当执行命令`concurrency get -h`/`concurrency get --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s concurrency get`进行指定的函数资源配 concurrency 详情获取；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 concurrency get --region cn-hangzhou --function-name test-function`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  functionArn: acs:fc:cn-hangzhou:143**********149:functions/test-function
  reservedConcurrency: 10
```

## concurrency put 命令

`concurrency put` 命令，设置函数资源配额 concurrency。

当执行命令`concurrency put -h`/`concurrency put --help`时，可以获取帮助文档。

### 参数解析

| 参数全称             | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| -------------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- | --- |
| region               | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name        | -        | 选填            | 必填           | 函数名                                                                                                                 |     |
| reserved-concurrency | -        | 必填            | 必填           | 最大按量实例数量                                                                                                       |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数) |

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s concurrency put --reserved-concurrency 10` 进行函数资源配额 concurrency 的设置；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名，例如`s cli fc3 concurrency put --function-name test-function --reserved-concurrency 10`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  functionArn: acs:fc:cn-hangzhou:143**********149:functions/test-function
  reservedConcurrency: 10
```

## concurrency remove 命令

`concurrency remove` 命令，是用户删除指定函数资源配额 concurrency 的命令。

当执行命令`concurrency remove -h`/`concurrency remove --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |
| assume-yes    | y        | 选填            | 选填           | 在交互时，默认选择`y`                                                                                                  |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s concurrency remove` 删除指定函数资源配额 concurrency；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 concurrency remove --region cn-hangzhou --function-name test-function`；

<!-- 上述命令的执行结果示例：

```text
VersionId [1] deleted successfully.
``` -->

## 权限与策略说明

- `concurrency get` 命令所需要的权限策略： `AliyunFCReadOnlyAccess`

- `concurrency put` 命令所需要的权限策略：

  ```json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:PutFunctionConcurrencyConfig",
        "Effect": "Allow",
        "Resource": "acs:fc:{region}:{uid}:functions/{functionName}"
      }
    ]
  }
  ```

- `concurrency remove` 命令所需要的权限策略：
  `AliyunFCReadOnlyAccess`

  ```json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:PutFunctionConcurrencyConfig",
        "Effect": "Allow",
        "Resource": "acs:fc:{region}:{uid}:functions/{functionName}"
      }
    ]
  }
  ```
