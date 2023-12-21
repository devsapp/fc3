---
title: fc yaml to fc 3.0 yaml
description: 'fc组件yaml转为fc3组件的yaml'
position: 4
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

| 参数全称 | 参数缩写 | Cli 模式下必填 | 参数含义                                                                                              |
| -------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| source   | -        | 选填           | 需要被转换的 s.yaml 文件路径, 默认值为 s.yaml 或者 s.yml (根据您当前目录存在文件是 s.yaml 还是 s.yml) |
| target   | -        | 选填           | 生成的 3.0 规范的 s.yaml 文件路径, 默认值为 s3.yaml                                                   |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

纯命令行形式，例如`s cli fc3 s2tos3 --source s.yaml --target s3.yaml`；

### 注意

**3.0 相对 2.0 不支持的功能如下：**

- 非 custom/custom-container runtime，不支持单实例多并发， 即 instanceConcurrency 永远为 1

- custom container 中的 No webServerMode 模式不再支持

- 异步调用配置中 StatefulInvocation 不再支持，可以通过调用函数的时候，采用 header 指定这次调用为异步有状态调用

**因此对于 2.0 转成生成的 FC 3.0 版本的 s.yaml， 尽量保证 s deploy 行为的兼容:**

1. 对于非 custom/custom-container runtime，instanceConcurrency 字段不再有效，您即使修改 instanceConcurrency 的值， 重新 `s deploy -t s3.yaml`， instanceConcurrency 也不会生效。

2. 对于 2.0 yaml 中的 custom container 中的 webServerMode 字段会忽略， 执行`s deploy -t s3.yaml` ， 但不会影响原来的 webServerMode 值

3. 对于 2.0 yaml 异步调用配置中 statefulInvocation 字段会忽略， 执行`s deploy -t s3.yaml`， 但不会影响原来的 statefulInvocation 值

4. 对于 actions 或者 plugin 中有一些自定义行为可能需要进行一些调试调整
