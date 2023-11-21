---
title: 移除 remove
description: '移除 remove'
position: 3
category: '构建&部署'
---

# Remove 命令

`remove` 命令是对已经部署的资源进行移除的操作。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [权限与策略说明](#权限与策略说明)

> ⚠️ 注意： **值得注意的是，资源一旦移除可能无法恢复，所以在使用移除功能时，请您慎重操作**

## 命令解析

当执行命令`remove -h`/`remove --help`时，可以获取帮助文档。

### 参数解析

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                               |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| region        | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填            | 必填           | 函数名                                                                                                                 |
| trigger       | -        | 选填            | 选填           | 指定触发器名称，只部署触发器；支持多个触发器，名称用“,”分割                                                            |
| assume-yes    | y        | 选填            | 选填           | 在交互时，默认选择`y`                                                                                                  |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

**有资源描述文件（Yaml）时**，可以直接执行`s remove`进行资源删除，部署完成的输出示例：

```text
Remove function: test-remove-function
```

> ⚠️ 注意：
>
> - 如果使用了参数`-y`/`--assume-yes`，那么就会无交互式的**强制删除**函数下**所有的资源**，请谨慎使用此参数；

**删除资源顺序:**

- triggers
- asyncInvokeConfig
- provision
- concurrency
- aliases
- versions
- function

## 权限与策略说明

`AliyunFCReadOnlyAccess`

    ```json
    {
        "Version": "1",
        "Statement": [
            {
                "Action": "fc:Delete*",
                "Effect": "Allow",
                "Resource": "*"
            }
        ]
    }
    ```
