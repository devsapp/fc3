---
title: fc yaml to fc 3.0 yaml
description: 'fc组件yaml转为fc3组件的yaml'
position: 2
category: 'Yaml规范'
---

# s2tos3 命令

`s2tos3` 命令是将 fc 组件的 s.yaml 转换成 fc3.0 的 s.yaml。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)

## 命令解析

当执行命令`s2tos3 -h`/`s2tos3 --help`命令时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Cli模式下必填 | 参数含义                                                     |
| ------------- | -------- |  ------------- | ------------------------------------------------------------ |
| source                       | -        | 选填           | 需要被转换的 s.yaml 文件路径 |
| target               | -        |  选填           | 生成的 3.0 规范的 s.yaml 文件路径 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

纯命令行形式，例如`s cli fc3 s2tos3 --source s.yaml --target s3.yaml`；
