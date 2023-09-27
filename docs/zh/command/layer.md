---
title: 层 layer
description: '层 layer'
position: 5
category: '发布&配置'
---

# Layer 命令

`layer` 命令是进行层操作的命令。

- [命令解析](#命令解析)
- [layer publish 命令](#layer-publish-命令)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [layer list 命令](#layer-list-命令)
  - [参数解析](#参数解析-1)
  - [操作案例](#操作案例-1)
- [layer info 命令](#layer-info-命令)
  - [参数解析](#参数解析-2)
  - [操作案例](#操作案例-2)
- [layer versions 命令](#layer-versions-命令)
  - [参数解析](#参数解析-3)
  - [操作案例](#操作案例-3)
- [layer download 命令](#layer-download-命令)
  - [参数解析](#参数解析-4)
  - [操作案例](#操作案例-4)
- [layer acl 命令【公测】](#layer-acl-命令)
  - [参数解析](#参数解析-5)
  - [操作案例](#操作案例-5)
- [layer remove 命令](#layer-remove-命令)
  - [参数解析](#参数解析-6)
  - [操作案例](#操作案例-6)
- [权限与策略说明](#权限与策略说明)

## 命令解析

当执行命令`layer -h`/`layer --help`时，可以获取帮助文档。

在该命令中，包括了四个子命令：

- [publish：发布层](#layer-publish-命令)
- [list：获取层列表](#layer-list-命令)
- [detail：获取层详情](#layer-detail-命令)
- [versions：获取层版本](#layer-versions-命令)

## layer publish 命令

`layer publish` 命令，是用于层发布的命令。

当执行命令`layer publish -h`/`layer publish --help`时，可以获取帮助文档。

### 参数解析

| 参数全称           | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ------------------ | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region             | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| code               | -        | 必填            | 必填           | 层的代码                                                                                                                                                                                                                                                                                                   |
| compatible-runtime | -        | 必填            | 必填           | 支持的运行时，取值范围参见[函数计算运行时介绍](https://www.alibabacloud.com/help/zh/fc/user-guide/overview-of-runtimes)                                                                                                                                                                                                                      |
| description        |          | 选填            | 选填           | 发布层的描述                                                                                                                                                                                                                                                                                               |
| layer-name         |          | 必填            | 必填           | 层的名字                                                                                                                                                                                                                                                                                                   |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer publish`进行层的发布，例如` s layer publish --layer-name demo --code ./code`；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer publish --region cn-hangzhou --layer-name demo --code ./code` ；

Python 项目的依赖库需要放在`./code/python`路径下，比如`./code/python/flask`。

上述命令的执行结果示例：

```text
fc3-deploy-test: 
  acl:               0
  code: 
    location:       fc-hhht-hasuhai-func-code/143**********149/demo/2d85431f-a449-4e1e-a87f-4ddc3dad01a5
    repositoryType: oss
  codeChecksum:      6647856715255221341
  codeSize:          230
  compatibleRuntime: 
    - python3.9
    - python3.10
  createTime:        2023-09-26T03:02:01Z
  description:       
  layerName:         demo
  layerVersionArn:   acs:fc:cn-hangzhou:143**********149:layers/demo/versions/1
  license:           
  version:           1
```

## layer list 命令

`layer list` 命令，是用于获取层列表的命令。

当执行命令`layer list -h`/`layer list --help`时，可以获取帮助文档。

### 参数解析

| 参数全称 | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| -------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| prefix   | -        | 选填            | 选填           |                                                                         层名称的前缀。限定返回的资源名称，假设Prefix为a，则返回的资源名必须以a开头。       |
| public   | -        | 选填            | 选填           |                                                                       展示个人的公共层         |
| official   | -        | 选填            | 选填           |                                                                        展示官方的公共层。设置official=true后，public自动设为true，设置为false无效。        |
| table    | -        | 选填            | 选填           |  以表格形式输出                                                                                                                                                                                                                                                                                   |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer list`获取层列表；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer list --region cn-hangzhou`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
   - 
    layerName:         demo
    layerVersionArn:   acs:fc:cn-hangzhou:143**********149:layers/demo/versions/1
    version:           1
    acl:               0
    description:       
    compatibleRuntime: 
      - python3.9
      - python3.10
```

## layer info 命令

`layer info` 命令，是用户获取指定层和版本详情的命令。

当执行命令`layer info -h`/`layer info --help`时，可以获取帮助文档。

### 参数解析

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ---------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| layer-name | -        | 必填            | 必填           | 层名称                                                                                                                                                                                                                                                                                                     |
| version-id | -        | 必填            | 必填           | 层版本                                                                                                                                                                                                                                                                                                     |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer detail --layer-name layerName --version-id versionId`获取指定层和指定版本详情；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer detail --region cn-hangzhou --layer-name demo --version-id 1`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  acl:               0
  compatibleRuntime: 
    - python3.9
    - python3.10
  description:       
  layerName:         demo
  layerVersionArn:   acs:fc:cn-hangzhou:143**********149:layers/demo/versions/1
  version:           1
```

## layer versions 命令

`layer versions` 命令，是获取指定层版本列表的命令。

当执行命令`layer version -h`/`layer versions --help`时，可以获取帮助文档。

### 参数解析

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ---------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region             | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| layer-name | -        | 必填            | 必填           | 层名称                                                                                                                                                                                                                                                                                                     |
| table      | -        | 选填            | 选填            | 以表格形式输出                                                                                                                                                                                                                                                                                         |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer versions --layer-name layerName`获取指定层中的版本列表；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer versions --layer-name layerName --region cn-hangzhou`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  - 
    acl:               0
    compatibleRuntime: 
      - python3.9
      - python3.10
    description:       
    layerName:         demo
    layerVersionArn:   acs:fc:cn-hangzhou:143**********149:layers/demo/versions/1
    version:           1
```

## layer download 命令

`layer download` 命令，是用户下载指定层版本的命令。

当执行命令`layer download -h`/`layer download --help`时，可以获取帮助文档。

### 参数解析

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ---------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region             | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| layer-name | -        | 必填            | 必填           | 层名称                                                                                                                                        |
| version-id | -        | 必填            |必填           | 版本                                                                                                                                         |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer download --layer-name layerName --version-id versionId`下载层版本的代码包；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer download --region cn-hangzhuo --layer-name demo --version-id 1`；

上述命令的执行结果示例：

```text
Downloading[/1431999136518149/demo/2d85431f-a449-4e1e-a87f-4ddc3dad01a5]...
Download 1 successfully
✔ [hello_world] completed (3.35s)

🚀 Result for [layer] of [hello-world-app]
====================
hello_world: /Users/youyi/.s/cache/layers/143**********149-cn-hangzhou-demo/1.zip
```

## layer acl 命令

`layer acl` 命令，个人层设置公开。

> 说明：如果函数配置其他账户的公共层时，需要使用 arnV2 版本。

当执行命令`layer acl -h`/`layer acl --help`时，可以获取帮助文档。

### 参数解析

| 参数全称   | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ---------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region             | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| layer-name | -        | 必填            | 必填           | 层名称 |
| public | -        | 选填            | 选填           | 个人层设置公开 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer acl --layer-name layerName --public`设置层公开，或者执行`s layer acl --layer-name layerName --public false` 设置层不公开；

- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer acl --region cn-hangzhuo --layer-name demo --public`；

## layer remove 命令
`layer remove` 命令，是用户删除指定已发布的版本命令。

当执行命令`layer remove -h`/`layer remove --help`时，可以获取帮助文档。

### 参数解析

| 参数全称     | 参数缩写 | Yaml模式下必填 | Cli模式下必填 | 参数含义                                                     |
| ------------ | -------- | -------------- | ------------- | ------------------------------------------------------------ |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| layer-name | -        | 必填           | 必填          | 层名称                                                       |
| version-id | -        | 选填           | 选填          | 指定层版本。如果指定--version-id，仅删除指定的版本；否则删除层的所有的版本 |  
| assume-yes | y        | 选填           |选填   | 在交互时，默认选择`y`                                        |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s layer remove --layer-name layerName`删除层的所有版本；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区，例如`s cli fc3 layer remove --region cn-hangzhou --layer-name demo`；

<!-- 上述命令的执行结果示例：

```text
Layer [demo] deleted successfully.
``` -->


## 权限与策略说明

- `layer list`、`layer version`与`layer info` 命令所需要的权限策略： `AliyunFCReadOnlyAccess`

- `layer publish` 命令所需要的权限策略：

  ```json
  {
    "Version": "1",
    "Statement":
      [
        {
          "Action": "fc:CreateLayerVersion",
          "Effect": "Allow",
          "Resource": "acs:fc:{region}:{uid}:layers/{layerName}/versions/*"
        }
      ]
  }
  ```

- `layer remove` 命令所需要的权限策略：
  `AliyunFCReadOnlyAccess`

  ````json
  {
    "Version": "1",
    "Statement": [
      {
        "Action": "fc:DeleteLayerVersion",
        "Effect": "Allow",
        "Resource": "acs:fc:{region}:{uid}:layers/{layerName}/versions/*"
      }
    ]
  }
  ````