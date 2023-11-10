---
title: 资源同步 sync
description: '资源同步 sync'
position: 4
category: '其他功能'
---

# Sync 命令

`sync` 命令是将线上的资源同步到本地的命令。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`sync -h`/`sync --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |
| target-dir    | -        | 选填            | 选填           | 目标路径, 默认是当前目录                                                                                               |
| qualifier     | -        | 选填            | 选填           | 版本或者别名                                                                                                           |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s sync`将线上资源同步到本地；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要按需指定函数名等，例如`s cli fc3 sync --region cn-hangzhou --function-name test-function`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  ymlPath:  /Users/youyi/fc-deploy/sync-clone/cn-hangzhou_test-function.yaml
  codePath: /Users/youyi/fc-deploy/sync-clone/cn-hangzhou_test-function
```

## 权限与策略说明

使用该命令时，推荐配置系统策略：`AliyunFCReadOnlyAccess`
