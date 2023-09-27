---
title: Deploy 命令
description: 'Deploy 命令'
position: 1
category: '构建&部署'
---
# Deploy 命令

`deploy` 命令是对函数资源进行部署的命令，即将本地在  [`Yaml` 文件](../yaml/readme.md) 中声明的资源部署到线上。

  - [命令解析](#命令解析)
    - [参数解析](#参数解析)
    - [操作案例](#操作案例)
    - [注意事项](#注意事项)
  - [权限与策略说明](#权限与策略说明)

> 关于 [如何部署多个函数](../tips.md#如何声明部署多个函数) 等问题，请参考 [Tips 文档](../tips.md) 。

## 命令解析

当执行命令`deploy -h`/`deploy --help`时，可以获取帮助文档。


### 参数解析

| 参数全称   | 参数缩写 | Yaml模式下必填 | 参数含义                                                     |
| ---------- | -------- | -------------- | ------------------------------------------------------------ |
| function      | -        | 选填           | 部署类型，可以选择`code, config`；code 表示仅更新函数代码，config 表示仅更新函数配置                          |
| trigger  | -        | 选填           | 指定触发器名称，只部署触发器；支持多个触发器，名称用 "," 分割           |
| skip-push | -        | 选填           | 跳过自动推送容器镜像这一环节, 仅针对 custom-container runtime                                    |
| assume-yes | y        | 选填           | 在交互时，默认选择`y`                                        |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

**有资源描述文件（Yaml）时**，可以直接执行`s deploy `进行资源部署，部署完成的输出示例：


```text
hello_world:
  region:         cn-hangzhou
  description:    hello world by serverless devs
  functionName:   start-python-5lyc
  handler:        index.handler
  internetAccess: true
  logConfig:
    enableInstanceMetrics: true
    enableRequestMetrics:  true
    logBeginRule:          DefaultRegex
    logstore:              function-logstore
    project:               143**********149-cn-huhehaote-project
  memorySize:     128
  role:
  runtime:        python3.9
  timeout:        30
```

### 注意事项

在进行资源部署时，会涉及到一定的特殊情况，可以参考以下描述：

- **只需要部署/更新代码**，可以增加`--function code`参数；只需要部署/更新配置，可以增加`--function config`参数；
- **auto**: 支持如下三种模式的 auto, s会自动创建并复用相关云资源，一般用于快速体验上手。
  - logConfig: auto
  - nasConfig: auto
  - vpcConfig: auto

## 权限与策略说明

`deploy`命令的权限，更多是和 Yaml 中所配置的参数有一定的关系，所以此处可以参考 [Yaml 规范文档](../yaml/readme.md) 中关于不同字段与权限的配置。

一般是 `AliyunFCFullAccess` 即可， 如果涉及到触发器或者上文中的 auto， 即需要相关云资源的权限。