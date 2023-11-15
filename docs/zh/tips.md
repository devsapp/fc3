---
title: 常见小贴士
description: '常见小贴士'
position: 4
category: '概览'
---

# 常见小贴士

- [ServerlessDevs 和 fc3 组件的关系](#serverless-devs和fc3组件的关系)
- [如何声明/部署多个函数](#如何声明部署多个函数)
- [如何配置函数的自定义域名](#如何配置函数的自定义域名)
- [如何实现函数多 region 部署](#如何实现函数多region部署)
- [如何给`VSCode`做智能提示和检测](#智能提示和检测)
- [关于`.fcignore`使用方法](#关于fcignore使用方法)
- [关于`.env`使用方法](#关于env使用方法)
- [Yaml 是否支持全局变量/环境变量/引用外部文件](#Yaml是否支持全局变量/环境变量/引用外部文件)
- [Yaml 特殊变量](#Yaml特殊变量)
- [项目实践案例](#项目实践案例)

## serverless-devs 和 fc3 组件的关系

1. Serverless Devs 是一个无厂商锁定 Serverless 的工具框架，本身不具任何能力，用户可以通过引入不同的组件使用不同的功能

2. 而 fc3 组件则是这个工具框架的一个组件，主要是对阿里云函数计算进行操作的，例如创建函数，删除函数、发布版本、业务构建、在线调试等；

> 如果需要进行比喻：
>
> - Serverless Devs 是小时候玩的红白机，而 fc3 组件等都是游戏卡，游戏机本身不具备啥功能，根据我们插入的游戏卡实现不同的功能；
> - Serverless Devs 就相当于我们用的 VSCode 工具，本身不具备太多的能力，但是我们可以安装不同的插件，来丰富 VSCode 的能力，而这些插件对应到 Serverless Devs 生态中，就是不同的组件，例如 fc3 组件，fc3-domain 组件，ros 组件等；

## 如何声明/部署多个函数

请参考[s.yaml 中 next-function](https://github.com/devsapp/start-fc/blob/V3/fc-node/src/s.yaml#L52-L66)

## 如何配置函数的自定义域名

示例请参考[fc-custom-domain](https://github.com/devsapp/start-fc/blob/V3/fc-custom-domain/src/s.yaml#L52-L65)

有关 fc3-domain 组件请参考 [fc3-domain](https://github.com/devsapp/fc3-domain)

## 如何实现函数多 region 部署

**shell 脚本**

```bash
#! /bin/bash
regions=("cn-hangzhou" "ap-southeast-1")
for r in ${regions[@]}
do
  export REGION=$r
  s deploy -y
done
```

**s.yaml 示例**

```yaml
edition: 3.0.0
name: hello-world-app
access: 'default'
resources:
  hello_world:
    component: fc3
    props:
      region: ${env('REGION')}
      functionName: 'start-nodejs-im1g'
      description: 'hello world by serverless devs'
      runtime: 'nodejs14'
      code: ./code
      handler: index.handler
      memorySize: 128
      timeout: 30
```

## 智能提示和检测

给`VSCode`插件做智能提示和检测, 详情参考[intelligent](./intelligent.md)

## 关于`.fcignore`使用方法

**.fcignore 的内容如下**：

```plaintext
aaa
**/abc
!abc
.abc/**
bcd/fc
```

> 文件解读：
> aaa：忽略**根目录**的 aaa 的文件夹或文件
> \*\*/abc：忽略所有 abc 的文件夹或者文件
> !abc：不忽略根目录下的 abc 文件夹或者文件
> .abc/\*\*：忽略根目录下 .abc 的所有内容，但 .abc 的空文件夹不被忽略
> bcd/fc：忽略根目录 bcd 下 fc 的文件夹或者文件

**解析预期结果**
<img src="https://img.alicdn.com/imgextra/i3/O1CN013lTzB320pnDxSs2f2_!!6000000006899-2-tps-1474-802.png"/>

**deploy 到线上的目录结构**
<img src="https://img.alicdn.com/imgextra/i1/O1CN01kWLiJf1yxv18HKimw_!!6000000006646-2-tps-852-760.png"/>

## 关于`.env`使用方法

项目代码中涉及到数据库的连接信息，云账号的`AccessKeyID`, `AccessKeySecret`等敏感信息，禁止写死在代码中，提交到 git 仓库。否则会造成严重的安全风险。

### 使用步骤

1. 假设我的.env 文件如下

```bash
AccessKeyID=xxxx
AccessKeySecret=xxxxxxx
```

> 注意：务必在`.gitignore`中忽略`.env`文件

2. 配置文件(`s.yaml`)可以将`.env`中变量作为环境变量传递到 FC 执行环境中：

```yaml
# s.yaml
edition: 3.0.0
name: fc3DeployApp
access: default

resources:
  test-function:
    component: fc3
    props:
      region: cn-hangzhou
      functionName: test
      runtime: nodejs16
      code: ./code
      handler: index.handler
      environmentVariables:
        AccessKeyID: ${env('AccessKeyID')}
        AccessKeySecret: ${env('AccessKeySecret')}
```

3. 在项目代码中读取环境变量

- 本地测试可以通过类似[dotenv](https://www.npmjs.com/package/dotenv)库来读取`.env`环境变量
- 在 FC 环境线上执行时候，会将环境变量直接注入到当前进程，NodeJS 应用可以通过`process.env.AccessKeyID`直接获取环境变量。

## Yaml 是否支持全局变量/环境变量/引用外部文件

Serverless Devs 的 Yaml 规范本身支持全局变量、环境变量以及外部内容的引入：

- 获取当前机器中的环境变量：`${env('环境变量')}`，例如`${env('secretId')}`
- 获取外部文档的变量：`${file('路径')}`，例如`${file('./path')}`
- 获取全局变量：`${vars.*}`
- 获取其他项目的变量：`${projectName.props.*}`
- 获取 Yaml 中其他项目的结果变量：`${resources.projectName.output.*}`
- 获取当前配置的 config 变量：`${config('AccountID')}`
  本质是获取 `s config get`中变量值
- 获取当前模块的信息：`${this.xx}`, 比如 `${this.props.name}`

> 详情可以参考：[Serverless Devs Yaml 规范文档](https://github.com/Serverless-Devs/Serverless-Devs/blob/master/docs/zh/yaml.md)

## Yaml 特殊变量

在 Serverless-Devs 中有些特殊变量有特定的用途，开发者没有特殊的需求，避免使用特殊变量

- `${aliyun-cli}`
  作用在`access`的值中，从获取[aliyun cli](https://github.com/aliyun/aliyun-cli)的默认的`profile`，并且生效。

> 执行`aliyun configure list`可以查看当前生效的`profile`

## 项目实践案例

- [start-fc](https://github.com/devsapp/start-fc/tree/V3)

- [Serverless 开发平台应用中心](https://devs.console.aliyun.com/applications)
