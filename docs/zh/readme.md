---
title: 简介
description: '函数计算（fc3）组件'
position: 1
category: '概览'
---

![图片alt](https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635756716877_20211101085157044368.png)

<p align="center" class="flex justify-center">
  <a href="https://nodejs.org/en/" class="ml-1" target="_blank">
    <img src="https://img.shields.io/badge/node-%3E%3D%2014.14.0-brightgreen" alt="node.js version">
  </a>
  <a href="https://github.com/devsapp/fc3/blob/master/LICENSE" class="ml-1" target="_blank">
    <img src="https://img.shields.io/badge/License-MIT-green" alt="license">
  </a>
  <a href="https://github.com/devsapp/fc3/issues" class="ml-1" target="_blank">
    <img src="https://img.shields.io/github/issues/devsapp/fc3" alt="issues">
  </a>
</p>

<p align="center" class="flex justify-center">
  <a href="https://github.com/devsapp/fc3/actions/workflows/ci_node16.yaml" class="ml-1" target="_blank">
    <img src="https://github.com/devsapp/fc3/actions/workflows/ci_node16.yaml/badge.svg" alt="Nodejs16 base ci">
  </a>
  <a href="https://github.com/devsapp/fc3/actions/workflows/ci_with_docker_linux.yaml" class="ml-1" target="_blank">
    <img src="https://github.com/devsapp/fc3/actions/workflows/ci_with_docker_linux.yaml/badge.svg" alt="Linux docker ci">
  </a>
  <a href="https://github.com/devsapp/fc3/actions/workflows/ci_with_docker_macos.yaml" class="ml-1" target="_blank">
    <img src="https://github.com/devsapp/fc3/actions/workflows/ci_with_docker_macos.yaml/badge.svg" alt="macos docker ci">
  </a>
</p>

# 五大亮点

- **全生命周期管理**：组件拥有项目的创建、开发、调试、部署、运维全生命周期管理能力；
- **安全发布**：通过其他形式对函数进行变更，组件可以感知并安全更新；
- **快速集成**：借助于 Serverless Devs 的集成性和被集成性，可以与常见的 [CI/CD 平台工具](https://github.com/Serverless-Devs/Serverless-Devs/blob/master/docs/cicd.md) 等集成；
- **可观测性**：拥有完善的可观测性，在客户端可以通过[日志查询 logs](./command/logs.md) 等命令，进行执行日志观测；
- **多模调试**：提出了多模调试方案，可以同时满足开发态、运维态的不同调试需求；包括[本地运行](./command/local.md)、[在线运行](./command/invoke.md) 等功能；

**注意:**

> 如果您是函数计算老用户，操作存量具有 Service 的函数, 见[fc 组件](https://docs.serverless-devs.com/fc/readme)

# 快速开始

🙋 三步即可上手 函数计算（fc3）组件的使用：
❶ [安装 Serverless Devs 开发者工具](https://github.com/Serverless-Devs/Serverless-Devs/blob/master/docs/zh/install.md) ：`npm install -g @serverless-devs/s`；

> 安装完成还需要配置密钥，可以参考[密钥配置文档](config.md)

❷ 初始化一个函数计算的 `Hello World` 项目：`s init start-fc3-python`；
❸ 初始化完成之后，系统会提示是否部署项目，只需要输入`y`并按回车按钮即可完成项目的部署；

- [更多入门示例](https://github.com/devsapp/start-fc/tree/V3)
- [Tips](./tips.md)

# 文档相关

函数计算（fc3）组件全部支持的能力列表如下：

| 构建&部署                              | 可观测性                           | 调用&调试                                  | 发布&配置                                        | 其他功能                                    |
| -------------------------------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------ | ------------------------------------------- |
| [**部署 deploy**](./command/deploy.md) | [日志查询 logs](./command/logs.md) | [**本地调用 local**](./command/local.md)   | [**版本 version**](./command/version.md)         | [查看函数 info](./command/info.md)          |
| [**构建 build**](./command/build.md)   |                                    | [函数触发 invoke](./command/invoke.md)     | [**别名 alias**](./command/alias.md)             | [**资源同步 sync**](./command/sync.md)      |
| [移除 remove](./command/remove.md)     |                                    | [实例登录 instance](./command/instance.md) | [预留 provision](./command/provision.md)         | [**YAML 转换 s2tos3**](./command/s2tos3.md) |
| [计划变更 plan](./command/plan.md)     |                                    |                                            | [按量资源 concurrency](./command/concurrency.md) |                                             |
|                                        |                                    |                                            | [层 layer](./command/layer.md)                   |                                             |

在使用函数计算（fc3）组件时，还会涉及到资源描述文件的编写，关于函数计算（fc3）组件的 Yaml 规范可以参考[**函数计算（fc3）Yaml 规范文档**](./yaml/readme.md)

# 项目贡献

我们非常希望您可以和我们一起贡献这个项目。贡献内容包括不限于代码的维护、应用/组件的贡献、文档的完善等，更多详情可以参考[🏆 贡献指南](./../../CONTRIBUTING.md)。

与此同时，我们也非常感谢所有[👬 参与贡献的小伙伴](https://github.com/devsapp/fc3/graphs/contributors) ，为 Serverless Devs fc3 组件项目贡献的努力和汗水。

# 开源许可

Serverless Devs fc3 组件遵循 [MIT License](./../../LICENSE) 开源许可。

位于`node_modules`和外部目录中的所有文件都是本软件使用的外部维护库，具有自己的许可证；我们建议您阅读它们，因为它们的条款可能与[MIT License](./../../LICENSE)的条款不同。

# 交流社区

您如果有关于错误的反馈或者未来的期待，您可以在 [Serverless Devs repo Issues](https://github.com/serverless-devs/serverless-devs/issues) 或 [fc3 repo issues](https://github.com/devsapp/fc3/issues) 中进行反馈和交流。如果您想要加入我们的讨论组或者了解 fc3 组件的最新动态，您可以通过以下渠道进行：

<p align="center">

| <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407298906_20211028074819117230.png" width="200px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407044136_20211028074404326599.png" width="200px" > | <img src="https://serverless-article-picture.oss-cn-hangzhou.aliyuncs.com/1635407252200_20211028074732517533.png" width="200px" > |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| <center>关注微信公众号：`serverless`</center>                                                                                     | <center>联系微信小助手：`xiaojiangwh`</center>                                                                                    | <center>加入钉钉交流群：`33947367`</center>                                                                                       |

</p>
