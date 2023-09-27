---
title: 预留 provision
description: '预留 provision'
position: 3
category: '发布&配置'
---

# Provision 命令

`provision` 命令是进行函数预留操作的命令；主要包括预留配置的查看与更新等操作。

- [命令解析](#命令解析)
- [provision list 命令](#provision-list-命令)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [provision put 命令](#provision-put-命令)
  - [参数解析](#参数解析-1)
  - [操作案例](#操作案例-1)
- [provision get 命令](#provision-get-命令)
  - [参数解析](#参数解析-2)
  - [操作案例](#操作案例-2)
- [provision remove 命令](#provision-remove-命令)
- [权限与策略说明](#权限与策略说明)

> ⚠️ 注意：**预留资源会持续产生费用，如果不需要请及时释放资源**

## 命令解析

当执行命令`provision -h`/`provision --help`时，可以获取帮助文档。

在该命令中，包括了四个子命令：

- [list：查看预留列表](#provision-list-命令)
- [put：配置预留（配置规则，包括缩减到 0，即删除预留）](#provision-put-命令)
- [get：获取预留配置详情](#provision-get-命令)
- [remove：删除预留资源](#provision-remove-命令)

## provision list 命令

`provision list` 命令，是查看函数已发布的版本列表的命令。

当执行命令`provision list -h`/`provision list --help`时，可以获取帮助文档。

### 参数解析

| 参数全称     | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ------------ | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名 |


> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s provision list`查看当前预留示例列表；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 provision list --region cn-hangzhou --function-name test-function`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  - 
    alwaysAllocateCPU:      false
    current:                10
    currentError:           
    functionArn:            acs:fc:cn-hangzhou:143**********149:functions/start-python-9fqu
    scheduledActions:       []
    target:                 10
    targetTrackingPolicies: []
```

## provision put 命令

`provision put` 命令用于配置预留。

当执行命令`provision put -h`/`provision put --help`时，可以获取帮助文档。

### 参数解析

| 参数全称            | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ------------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名 |
| qualifier           |  -       | 必填            | 必填           | 配置预留的版本，仅支持 LATEST 和别名                                               |
| target              |  -       | 必填            | 必填              | 预留实例数量，target 如果大于 0，配置函数预留，**预留资源会持续产生费用，如果不需要请及时释放资源**；target 如果等于 0，释放预留资源  |
| always-allocate-cpu           |   ac     | 选填            | 选填           | 一直给预留实例分配CPU资源                                               |
| scheduled-actions           |   -     | 选填            | 选填           | 配置预留模式的定时修改限制                |
| target-tracking-policies           |   -    | 选填            | 选填           | 配置预留模式的根据指标修改限制                |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

其中`scheduledActions`参数的数据结构为：

| 参数名             | 类型   | 是否必填 | 示例                  | 描述                                                                                                                                                                                                                 |
| ------------------ | ------ | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name               | string | 是       | demoScheduler         | 定时任务的名称。                                                                                                                                                                                                     |
| startTime          | string | 是       | 2020-10-10T10:10:10Z  | 定时伸缩的起始生效时间。                                                                                                                                                                                             |
| endTime            | string | 是       | 2020-12-10T10:10:10Z  | 定时伸缩的结束生效时间。                                                                                                                                                                                             |
| target             | number | 是       | 10                    | 预留的目标资源个数。                                                                                                                                                                                                 |
| scheduleExpression | string | 是       | cron(0 30 8 \* \* \*) | 定时信息，支持两种格式。<br> - At expressions - "at(yyyy-mm-ddThh:mm:ss)"：只调度一次，使用 UTC 格式。<br/> - Cron expressions - "cron(0 0 20 \* \* \*)"：调度多次，使用标准 crontab 格式，如：每天 20:00 进行调度。 |

其中`targetTrackingPolicies`参数的数据结构为：

| 参数名       | 类型           | 是否必填 | 示例                              | 描述                     |
| ------------ | -------------- | -------- | --------------------------------- | ------------------------ |
| name         | string         | 是       | demoScheduler                     | 定时任务的名称。         |
| startTime    | string         | 是       | 2020-10-10T10:10:10Z              | 定时伸缩的起始生效时间。 |
| endTime      | string         | 是       | 2020-12-10T10:10:10Z              | 定时伸缩的结束生效时间。 |
| metricType   | string         | 是       | ProvisionedConcurrencyUtilization | 追踪的指标类型。<br> -ProvisionedConcurrencyUtilization：预留模式实例并发度利用率。<br> - CPUUtilization：CPU利用率。<br> - GPUMemUtilization：GPU利用率。 <br>      |
| metricTarget | number(double) | 是       | 0.6                               | 指标的追踪值。           |
| minCapacity  | number         | 是       | 10                                | 缩容的最小值。           |
| maxCapacity  | number         | 是       | 100                               | 扩容的最大值。           |


### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s provision put`进行版本的发布，例如`s provision put --qualifier release --target 10`；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 provision put --region cn-hangzhou --function-name test-function --qualifier LATEST --target 10`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  functionArn:            acs:fc:cn-hangzhou:143**********149:functions/start-python-9fqu
  scheduledActions:       []
  target:                 10
  targetTrackingPolicies: []
```

## provision get 命令

`provision get` 命令，是获取预留实例详情的命令。

当执行命令`provision get -h`/`provision get --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml 模式下必填 | Cli 模式下必填 | 参数含义                                                                                                                                                                                                                                                                                                   |
| ------------- | -------- | --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名 |
| qualifier     |    -    | 必填            | 必填           | 配置预留的版本，仅支持 LATEST 和别名                                                                                                                                                                                                                                                                 |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s provision get --qualifier qualifier`获取预留实例详情；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 provision get --region cn-hangzhou --function-name test-function --qualifier release`；

上述命令的执行结果示例：

```text
fc3-deploy-test:
  alwaysAllocateCPU:      false
  current:                10
  currentError:           
  functionArn:            acs:fc:cn-hangzhou:143**********149:functions/test-function
  scheduledActions:       []
  target:                 10
  targetTrackingPolicies: []

```
## provision remove 命令
`provision remove` 命令，是用户删除指定预留资源的命令。

当执行命令`provision remove -h`/`provision remove --help`时，可以获取帮助文档。

### 参数解析

| 参数全称     | 参数缩写 | Yaml模式下必填 | Cli模式下必填 | 参数含义                                                     |
| ------------ | -------- | -------------- | ------------- | ------------------------------------------------------------ |
| region                       | -        | 选填            | 必填           | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name                | -        | 选填            | 必填           | 函数名 |
| qualifier           |  -       | 必填            | 必填           | 配置预留的版本，仅支持 LATEST 和别名                                               |
| assume-yes | y        | 选填           |选填   | 在交互时，默认选择`y`                                        |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s provision remove --qualifier release`删除指定版本的预留配置；
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定函数所在地区以及函数名称，例如`s cli fc3 provision remove --region cn-hangzhou --function-name test-function --qualifier LATEST`；

<!-- 上述命令的执行结果示例：

```text
VersionId [1] deleted successfully.
``` -->

## 权限与策略说明

- `provision list`与`provision get` 命令所需要的权限策略： `AliyunFCReadOnlyAccess`

- `provision put` 命令所需要的权限策略：

  ```json
  {
    "Version": "1",
    "Statement":
      [
        {
          "Action": "fc:PutProvisionConfig",
          "Effect": "Allow",
          "Resource": [
            "acs:fc:{region}:{uid}:functions/{functionName}",
            "acs:fc:{region}:{uid}:functions/{functionName}/*"
          ]
        }
      ]
  }
  ```
- `provision remove` 命令所需要的权限策略：
  `AliyunFCReadOnlyAccess`   
    ```json
    {
        "Version": "1",
        "Statement": [
            {
                "Action": "fc:DeleteProvisionConfig",
                "Effect": "Allow",
                "Resource": [
                  "acs:fc:{region}:{uid}:functions/{functionName}",
                  "acs:fc:{region}:{uid}:functions/{functionName}/*"
                ]
            }
        ]
    }
    ```
