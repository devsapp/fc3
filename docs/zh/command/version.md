---
title: 版本 version
description: '版本 version'
position: 1
category: '发布&配置'
---

# Version 命令

`version` 命令是进行函数版本操作的命令；主要包括别名的查看、发布、删除等功能。

- [命令解析](#命令解析)
- [version list 命令](#version-list-命令)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [version publish 命令](#version-publish-命令)
  - [参数解析](#参数解析-1)
  - [操作案例](#操作案例-1)
- [version remove 命令](#version-remove-命令)
  - [参数解析](#参数解析-2)
  - [操作案例](#操作案例-2)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`version -h`/`version --help`时，可以获取帮助文档。

在该命令中，包括了三个子命令：

- [list：查看版本列表](#version-list-命令)
- [publish：发布版本](#version-publish-命令)
- [remove：删除版本](#version-remove-命令)

## version list 命令

`version list` 命令，是查看函数已发布的版本列表的命令。

当执行命令`version list -h`/`version list --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s version list`查看当前函数所发布的版本列表；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 version list --region cn-hangzhou --function-name test-function`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  -
    createdTime:      2023-09-25T06:57:24Z
    description:      test publish version 2
    lastModifiedTime: 2023-09-25T06:57:24Z
    versionId:        2
  -
    createdTime:      2023-09-25T06:46:28Z
    description:      test publish version
    lastModifiedTime: 2023-09-25T06:46:28Z
    versionId:        1
```

## version publish 命令

`version publish` 命令，是用于发布版本的命令。

当执行命令`version publish -h`/`version publish --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |
| description   | -        | 选填            | 选填           | 版本描述                                                                                                               |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s version publish`进行版本的发布；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 version publish --region cn-hangzhou --function-name test-function --description "test publish version"`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  createdTime:      2023-09-25T06:46:28Z
  description:      test publish version
  lastModifiedTime: 2023-09-25T06:46:28Z
  versionId:        1
```

## version remove 命令

`version remove` 命令，是用户删除指定已发布的版本命令。

当执行命令`version remove -h`/`version remove --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |
| version-id    | -        | 必填            | 必填           | 版本 Id                                                                                                                |
| assume-yes    | y        | 选填            | 选填           | 在交互时，默认选择`y`                                                                                                  |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s version remove --version-id versionId`删除指定`versionId`的版本；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 version remove --region cn-hangzhou --function-name test-function --version-id versionId`；

<!-- 上述命令的执行结果示例：

```text
VersionId [1] deleted successfully.
``` -->

## 权限与策略说明

- `version list` 命令所需要的权限策略： `AliyunFCReadOnlyAccess`

- `version publish` 命令所需要的权限策略：

  ```json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:PublishFunctionVersion",
        "Effect": "Allow",
        "Resource": "acs:fc:{region}:{uid}:functions/{functionName}/versions/*"
      }
    ]
  }
  ```

- `version remove` 命令所需要的权限策略：
  `AliyunFCReadOnlyAccess`

  ```json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:DeleteFunctionVersion",
        "Effect": "Allow",
        "Resource": "acs:fc:{region}:{uid}:functions/{functionName}/versions/*"
      }
    ]
  }
  ```
