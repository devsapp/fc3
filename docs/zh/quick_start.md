---
title: 功能
description: '快速体验功能'
position: 3
category: '概览'
---

# 快速体验功能

- [工具安装](#工具安装)
- [密钥配置](#密钥配置)
- [测试项目创建](#测试项目创建)
- [功能体验](#功能体验)
  - [部署 deploy](#部署-deploy)
  - [调用相关](#调用相关)
    - [本地调用](#本地调用)
    - [远程调用](#远程调用)
    <!-- - [可观测性](#可观测性)
    - [日志查看](#日志查看) -->
  - [其他](#其他)

## 工具安装

- 第一步：安装 Node.js(14.14.0) 与 npm 包管理工具；
- 第二步：安装 Serverless Devs 开发者工具；

  ```shell script
  npm install @serverless-devs/s -g
  ```

- 第三步：可以通过`s -v`判断工具是否安装成功，如果安装成功可以看到相对应的版本信息，例如：

  ```shell script
  @serverless-devs/s: 3.0.0, s-home: /root/.s, linux-x64, node-v16.13.1
  ```

## 密钥配置

参考[秘钥配置](./config.md)

## 测试项目创建

通过`s init`命令创建一个 Python 语言的 Hello World 项目，在引导的过程中，可能会出现填写项目名称以及选择密钥的过程：

- 项目名称可以是：`start-fc3-python`
- 密钥可以选择我们上文中创建过的：`alibaba-access`
  例如：

```shell script
$ s init start-fc3-python

? 🚀 More applications: https://registry.serverless-devs.com

? Please input your project name (init dir) start-fc3-python
✔ Download start-fc3-python successfully
? please select credential alias alibaba-access

...

🏄‍  Thanks for using Serverless-Devs
👉  You could [cd /Users/songluo/tmp/start-fc3-python] and enjoy your serverless journey!
🧭️  If you need help for this example, you can use [s -h] after you enter folder.
💞  Document ❤ Star: https://github.com/Serverless-Devs/Serverless-Devs
🚀  More applications: https://registry.serverless-devs.com

```

接下来，可以通过`cd`等命令进入项目（例如：`cd start-fc3-python`）。

## 功能体验

### 部署 deploy

为了便于后续的体验，可以对默认的`s.yaml`文件进行修改，增加自动化日志配置的能力：`logConfig: auto`，完整的项目 Yaml 如下：

```yaml
edition: 3.0.0 #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: hello-world-app #  项目名称
access: 'default' #  秘钥别名

resources:
  hello_world: #  资源虚拟ID，在 resources 下面全局唯一
    component: fc3 #  组件名称
    props: #  组件的属性值
      region: cn-hangzhou
      functionName: 'start-python-5lyc'
      description: 'hello world by serverless devs'
      runtime: 'python3.9'
      code: ./code
      handler: index.handler
      memorySize: 128
      timeout: 30
      logConfig: auto
```

保存并退出编辑之后，可以执行`s deploy`直接进行项目的部署，稍等片刻，即可看到部署结果：

```shell script
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

### 调用相关

#### 本地调用

```
$ s local invoke -e "test"
⌛ Steps for [local] of [hello-world-app]
====================
[2023-09-27 16:11:12][INFO][hello_world] Local baseDir is: /Users/songluo/tmp/start-fc3-python

...
registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python3.9:3.0.0


FunctionCompute python3 runtime inited.
FC Invoke Start RequestId: 0918f56e-affc-4911-b4c7-a98f1b9b0e29
2023-09-27T08:11:17.853Z 0918f56e-affc-4911-b4c7-a98f1b9b0e29 [INFO] b'test\n'
FC Invoke End RequestId: 0918f56e-affc-4911-b4c7-a98f1b9b0e29
test


RequestId: 0918f56e-affc-4911-b4c7-a98f1b9b0e29   Billed Duration: 240 ms   Memory Size: 128 MB   Max Memory Used: 13 MB


✔ [hello_world] completed (5.95s)

🚀 Result for [local] of [hello-world-app]
====================
hello_world:

A complete log of this run can be found in: /Users/xiliu/.s/logs/0927161111
```

#### 远程调用

在当前项目下，直接使用 `s invoke` 即可实现线上函数的调用/触发：

```
xiliu@xl-mac start-fc3-python $ s invoke -e "test"
⌛ Steps for [invoke] of [hello-world-app]
====================
========= FC invoke Logs begin =========
FunctionCompute python3 runtime inited.
FC Invoke Start RequestId: 1-6513e3fc-985ed1c8f1afcf92be9fe039
2023-09-27T08:12:44.485Z 1-6513e3fc-985ed1c8f1afcf92be9fe039 [INFO] b'test'
FC Invoke End RequestId: 1-6513e3fc-985ed1c8f1afcf92be9fe039

Duration: 2.19 ms, Billed Duration: 3 ms, Memory Size: 128 MB, Max Memory Used: 26.15 MB
========= FC invoke Logs end =========

Invoke instanceId: c-6513e3fc-cd80d7d5321248a599fa
Code Checksum: 2302327654191255932
Qualifier: LATEST
RequestId: 1-6513e3fc-985ed1c8f1afcf92be9fe039

Invoke Result:
test
✔ [hello_world] completed (0.6s)

A complete log of this run can be found in: /Users/xiliu/.s/logs/0927161243
```

<!-- ### 可观测性

#### 日志查看

在当前项目下，直接使用 `s logs` 命令，可以进行日志查看，也可以通过 `s logs -t` 进入到 `tail` 模式：

```shell script

FunctionCompute python3 runtime inited.

FC Invoke Start RequestId: eb9cf022-297e-4a27-b3bf-ad304f6e04c9
FC Invoke End RequestId: eb9cf022-297e-4a27-b3bf-ad304f6e04c9
``` -->

### 其他

更多命令的使用，可以参考命令帮助文档详情：

| 构建&部署                              | 可观测性                           | 调用&调试                                  | 发布&配置                                        | 其他功能                                    |
| -------------------------------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------ | ------------------------------------------- |
| [**部署 deploy**](./command/deploy.md) | [日志查询 logs](./command/logs.md) | [**本地调用 local**](./command/local.md)   | [**版本 version**](./command/version.md)         | [查看函数 info](./command/info.md)          |
| [**构建 build**](./command/build.md)   |                                    | [函数触发 invoke](./command/invoke.md)     | [**别名 alias**](./command/alias.md)             | [**资源同步 sync**](./command/sync.md)      |
| [移除 remove](./command/remove.md)     |                                    | [实例登录 instance](./command/instance.md) | [预留 provision](./command/provision.md)         | [**YAML 转换 s2tos3**](./command/s2tos3.md) |
| [计划变更 plan](./command/plan.md)     |                                    |                                            | [按量资源 concurrency](./command/concurrency.md) |                                             |
|                                        |                                    |                                            | [层 layer](./command/layer.md)                   |                                             |
