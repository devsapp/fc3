---
title: 计划变更 plan
description: '计划变更 plan'
position: 4
category: '构建&部署'
---

# Plan 命令

`plan` 命令是对函数计算资源变更感知的命令。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`plan -h`/`plan --help`时，可以获取帮助文档。

### 参数解析

| 参数全称   | 参数缩写 | Yaml模式下必填 | 参数含义                                                     |
| ---------- | -------- | -------------- | ------------------------------------------------------------ |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

**有资源描述文件（Yaml）时**，可以直接执行`s plan`进行资源变更感知，效果如下：

```
region: cn-huhehaote
function:
   description: hello world by serverless devs
   functionName: start-python-9fqu
   handler: index.handler
   internetAccess: true
   ~ memorySize: 128 => 256
   role: 
   runtime: python3.9
   - timeout: 3
   + cpu: 
```

> ~: 配置被修改
> -: 删除配置
> +: 添加配置

从图可以看出执行 deploy 之后预期：
1. function 的 memorySize 由 '128' 变更为 '256'
2. 删除了 function 的 timeout 配置
4. function 新增 cpu 配置 为 1

## 权限与策略说明

使用该命令时，推荐配置系统策略：`AliyunFCReadOnlyAccess`
