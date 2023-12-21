---
title: Yaml规范
description: 'Yaml规范说明'
position: 1
category: 'Yaml规范'
---

# Yaml 规范字段解析

[Yaml 完整示例](./example.md)

| 参数名                                              | 必填  | 类型                                          | 参数描述                                                                                                                                      |
| --------------------------------------------------- | ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| region                                              | True  | Enum                                          | 地域，支持情况参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability)。                          |
| [code](#code)                                       | True  | String[本地位置]/[Struct[远程位置]](#code)    | 代码位置，code 和 customContainerConfig 二选一                                                                                                |
| cpu                                                 | False | Number                                        | 函数的 CPU 规格，单位为 vCPU，为 0.05 vCPU 的倍数。                                                                                           |
| [customContainerConfig](#customcontainerconfig)     | False | [Struct](#customcontainerconfig)              | 自定义镜像配置                                                                                                                                |
| [customDNS](#customdns)                             | False | [Struct](#customdns)                          | DNS 配置                                                                                                                                      |
| [customRuntimeConfig](#customRuntimeConfig)         | False | [Struct](#customRuntimeConfig)                | 自定义运行时启动配置                                                                                                                          |
| description                                         | False | String                                        | 函数的简短描述                                                                                                                                |
| diskSize                                            | False | Number                                        | 函数的磁盘规格，单位为 MB，可选值为 512 MB 或 10240 MB。                                                                                      |
| instanceConcurrency                                 | False | Number                                        | 单实例多并发数，该参数仅针对 custom/custom.debian10/custom-container runtime 有效，范围为 [1, 100]                                            |
| [environmentVariables](#environmentvariables)       | False | [Struct](#environmentvariables)               | 环境变量                                                                                                                                      |
| funtionaName                                        | True  | String                                        | 函数名称                                                                                                                                      |
| [gpuConfig](#gpuConfig)                             | False | [Struct](#gpuConfig)                          | 环境变量                                                                                                                                      |
| handler                                             | False | String                                        | 函数执行的入口，具体格式和语言相关                                                                                                            |
| [instanceLifecycleConfig](#instancelifecycleconfig) | False | [Struct](#instancelifecycleconfig)            | 实例生命周期回调方法配置                                                                                                                      |
| internetAccess                                      | False | Boolean                                       | 设为 true 让 function 可以访问公网                                                                                                            |
| layers                                              | False | List\<String\>                                | 函数绑定层，支持 Nodejs、Python、Custom、Go1；取值是层的 ARN, 比如 acs:fc:cn-huhehaote:123456789:layers/test-lh/versions/1                    |
| [logConfig](#logconfig)                             | False | Enum[简单配置]/[Struct[详细配置]](#logconfig) | 日志 log 配置，函数产生的日志会写入这里配置的 logstore                                                                                        |
| memorySize                                          | False | Number                                        | 函数的内存规格                                                                                                                                |
| [nasConfig](#nasconfig)                             | False | Enum[简单配置]/[Struct[详细配置]](#nasconfig) | 文件存储 NAS 配置, 配置此参数后，函数可以访问指定的 NAS 资源                                                                                  |
| [ossMountConfig](#ossmountconfig)                   | False | [Struct[详细配置]](#ossmountconfig)           | 对象存储 OSS 挂载配置, 配置此参数后，函数可以访问指定 OSS bucket                                                                              |
| role                                                | False | String                                        | 授予函数计算所需权限的 RAM 角色，使用场景包含：1. 把函数产生的日志发送到您的日志库中。2. 为函数在执行过程中访问其他云资源生成的临时访问令牌。 |
| [runtime](#runtime)                                 | True  | String                                        | 函数的运行时环境                                                                                                                              |
| timeout                                             | False | Number                                        | 函数运行的超时时间，单位为秒，最小 1 秒，默认 3 秒。函数超过这个时间后会被终止执行                                                            |
| [tracingConfig](#tracingConfig)                     | False | [Struct](#tracingConfig)                      | 链链路追踪配置，当函数计算与链路追踪集成后，您可以记录请求在函数计算的耗时时间、查看函数的冷启动时间、记录函数内部时间的消耗等                |
| [vpcBinding](#vpcBinding)                           | False | [Struct](#vpcBinding)                         | 仅允许指定专有网络 VPC 调用函数 [文档](https://help.aliyun.com/document_detail/2513536.html)                                                  |
| [vpcConfig](#vpcconfig)                             | False | Enum[简单配置]/[Struct[详细配置]](#vpcconfig) | 专有网络 VPC 配置，配置此参数后，函数可以访问指定的 VPC 资源                                                                                  |
| [asyncInvokeConfig](#asyncInvokeConfig)             | False | [Struct](#asyncInvokeConfig)                  | 函数异步调用配置                                                                                                                              |
| [triggers](./triggers.md)                           | False | [Struct](./triggers.md)                       | 触发器                                                                                                                                        |

## code

函数代码位置。支持从项目中读取代码或者从 oss 中获取代码包。当代码位于项目下时，可以直接指定本地路径，code 类型为 String，支持文件夹或 zip 文件，例如'./code'、'./code.zip'。当代码位于 oss 上时，code 类型为 Struct，详细参数如下：

| 参数名        | 必填  | 类型   | 参数描述                                |
| ------------- | ----- | ------ | --------------------------------------- |
| ossBucketName | False | String | 存放函数代码 ZIP 包的 OSS Bucket 名称。 |
| ossObjectName | False | String | 存放函数代码 ZIP 包的 OSS Object 名称。 |

## customContainerConfig

| 参数名                                  | 必填  | 类型                         | 参数描述                                                            |
| --------------------------------------- | ----- | ---------------------------- | ------------------------------------------------------------------- |
| command                                 | False | List\<String\>               | 容器启动参数，示例值: ["/code/myserver"]                            |
| entrypoint                              | False | List\<String\>               | 容器启动指令，示例值: ["args", "value1"]                            |
| [healthCheckConfig](#healthCheckConfig) | False | [Struct](#healthCheckConfig) | 函数自定义健康检查配置，仅适用于 Custom Runtime 和 Custom Container |
| image                                   | True  | String                       | 容器镜像仓库地址                                                    |
| port                                    | False | Number                       | 自定义容器运行时 HTTP Server 的监听端口。                           |

### healthCheckConfig

| 参数名              | 必填  | 类型   | 参数描述                                                                       |
| ------------------- | ----- | ------ | ------------------------------------------------------------------------------ |
| failureThreshold    | False | Number | 健康检查失败次数阈值，达到该值后系统认为检查失败。取值范围 1~120。默认值为 3。 |
| httpGetUrl          | True  | String | 容器自定义健康检查 URL 地址。长度不超过 2048 个字符。                          |
| initialDelaySeconds | False | Number | 容器启动到发起健康检查的延迟。取值范围 0~120。默认值为 0。                     |
| periodSeconds       | False | Number | 健康检查周期。取值范围 1~120。默认值为 3。                                     |
| successThreshold    | False | Number | 健康检查成功次数阈值，达到该值后系统认为检查成功。取值范围 1~120。默认值为 1。 |
| timeoutSeconds      | False | Number | 健康检查超时时间。取值范围 1~3。默认值为 1。                                   |

## customDNS

| 参数名                    | 必填  | 类型                          | 参数描述                               |
| ------------------------- | ----- | ----------------------------- | -------------------------------------- |
| [dnsOptions](#dnsOptions) | False | [List\<Struct\>](#dnsOptions) | 对应 resolv.conf DNS 配置的 Options 项 |
| nameServers               | False | List\<String\>                | DNS 服务器的 IP 地址列表               |
| searches                  | False | List\<String\>                | DNS 搜索域列表                         |

### dnsOptions

dnsOptions 为 List\<Struct\>，其中每个 Struct 需符合如下参数规范：
| 参数名 | 必填 | 类型 | 参数描述 |
| ------ | ---- | ------ | ------------------------------------------ |
| name | True | String | 对应 resolv.conf DNS 配置的 Options 项的键 |
| value | True | String | 对应 resolv.conf DNS 配置的 Options 项的值 |

## customRuntimeConfig

| 参数名                                  | 必填  | 类型                         | 参数描述                                                            |
| --------------------------------------- | ----- | ---------------------------- | ------------------------------------------------------------------- |
| command                                 | False | List\<String\>               | 容器启动参数，示例值: ["/code/myserver"]                            |
| entrypoint                              | False | List\<String\>               | 容器启动指令，示例值: ["-arg1", "value1"]                           |
| [healthCheckConfig](#healthCheckConfig) | False | [Struct](#healthCheckConfig) | 函数自定义健康检查配置，仅适用于 Custom Runtime 和 Custom Container |
| port                                    | False | Number                       | 自定义容器运行时 HTTP Server 的监听端口。                           |

## environmentVariables

Object 格式，例如：

```
DB_connection: jdbc:mysql://rm-bp90434sds45c.mysql.rds.aliyuncs.com:3306/litemall
```

当然不推荐通过明文将敏感信息写入到`s.yaml`, 可以配合[.env](https://www.serverless-devs.com/fc/tips#%E5%85%B3%E4%BA%8Eenv%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95) 使用。
如果在 `CICD`流水线环境中，也可以通过`export DB_connection=xxx`到临时环境变量， 再配合`${env('DB_connection')}` （[$env 文档](https://github.com/devsapp/fc3/blob/master/docs/zh/tips.md#Yaml%E6%98%AF%E5%90%A6%E6%94%AF%E6%8C%81%E5%85%A8%E5%B1%80%E5%8F%98%E9%87%8F/%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F/%E5%BC%95%E7%94%A8%E5%A4%96%E9%83%A8%E6%96%87%E4%BB%B6)）进行引用

## gpuConfig

| 参数名        | 必填  | 类型   | 参数描述                                                                                                           |
| ------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| gpuMemorySize | False | Number | GPU 显存规格，单位为 MB，为 1024MB 的倍数                                                                          |
| gpuType       | False | String | GPU 卡类型。 fc.gpu.tesla.1 表示 GPU 实例 Tesla 系列 T4 卡型。fc.gpu.ampere.1 表示 GPU 实例 Ampere 系列 A10 卡型。 |

## instanceLifecycleConfig

| 参数名                        | 必填  | 类型                     | 参数描述                 |
| ----------------------------- | ----- | ------------------------ | ------------------------ |
| [initializer](#lifecycleHook) | False | [Struct](#lifecycleHook) | Initializer 回调方法配置 |
| [preStop](#lifecycleHook)     | False | [Struct](#lifecycleHook) | PreStop 回调方法配置     |

### lifecycleHook

| 参数名  | 必填  | 类型   | 参数描述                                   |
| ------- | ----- | ------ | ------------------------------------------ |
| handler | True  | String | 回调方法的执行入口，含义与请求处理程序类似 |
| timeout | False | Number | 回调方法的超时时间，单位为秒               |

## logConfig

当`logConfig`参数为简单配置时，可以是：`auto`。在部署阶段会先检测线上是否存在 logConfig 的配置，如果存在则直接复用线上配置，如果不存在则按照以下规则复用或者创建日志资源：

- 日志服务中的 project 名称为 `${accountID}-${region}-project`
- 日志服务中的 logstore 名称为`function-logstore`

当`logConfig`参数为结构时，可以参考：

| 参数名                | 必填  | 类型    | 参数描述                                 |
| --------------------- | ----- | ------- | ---------------------------------------- |
| logstore              | True  | String  | loghub 中的 logstore 名称                |
| project               | True  | String  | loghub 中的 project 名称                 |
| enableRequestMetrics  | False | Boolean | RequestMetrics 开关，取值`true`/`false`  |
| enableInstanceMetrics | False | Boolean | InstanceMetrics 开关，取值`true`/`false` |
| logBeginRule          | False | String  | 日志是否切分，取值 `DefaultRegex`/`None` |

### 权限配置相关

#### 子账号需要的权限

##### 最大权限

系统策略：`AliyunFCFullAccess`、`AliyunLogFullAccess`

##### 部署最小权限

- 当 `logConfig` 不为 `auto`

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
  ],
  "Version": "1"
}
```

- 当 `logConfg` 为 `auto`

**自定义策略**

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
    {
      "Action": ["log:GetProject", "log:CreateProject"],
      "Resource": "acs:log:<region>:<account-id>:project/<project-name>",
      "Effect": "Allow"
    },
    {
      "Action": ["log:CreateLogStore", "log:GetIndex", "log:GetLogStore", "log:CreateIndex"],
      "Resource": "acs:log:<region>:<account-id>:project/<project-name>/logstore/<logstore-name>",
      "Effect": "Allow"
    }
  ]
}
```

## nasConfig

当`nasConfig`参数为简单配置是，可以是：`auto`。在部署阶段规则如下：
会先检测在线上是否存在 nasConfig 的配置，如果存在配置则验证挂载点是否已经被删除，如果存在直接复用线上配置；如果不存在则再创建一个新的挂载点。

当`nasConfig`参数为结构时，可以参考：

| 参数名                      | 必填  | 类型                           | 参数描述          |
| --------------------------- | ----- | ------------------------------ | ----------------- |
| groupId                     | False | String                         | groupID, 默认为 0 |
| [mountPoints](#mountPoints) | True  | List\<[Struct](#mountPoints)\> | NAS 挂载点列表    |
| userId                      | False | String                         | userID, 默认为 0  |

### 权限配置相关

#### 子账号需要的权限

##### 最大权限

**系统策略**：`AliyunFCFullAccess`、`AliyunVPCFullAccess`、`AliyunNasFullAccess`

##### 部署最小权限

- 当 `nasConfig` 不为 `auto`

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
  ],
  "Version": "1"
}
```

- 当 `nasConfig` 为 `auto`

**系统策略**：`AliyunNasReadOnlyAccess`

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "fc:GetAccountSettings",
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:account-settings"
    },
    {
      "Action": ["fc:InvokeFunction", "fc:CreateFunction", "fc:UpdateFunction"],
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:functions/*"
    },
    {
      "Action": ["fc:UpdateTrigger", "fc:CreateTrigger"],
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:functions/*/triggers/*"
    },
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
    {
      "Action": [
        "nas:CreateMountTarget",
        "nas:DescribeMountTargets",
        "nas:DescribeFileSystems",
        "nas:CreateFileSystem",
        "vpc:DescribeVSwitchAttributes"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ],
  "Version": "1"
}
```

### mountPoints

mountPoints 为 List\<Struct\>，其中每个 Struct 需符合如下参数规范：
| 参数名 | 必填 | 类型 | 参数描述 |
| ---------- | ----- | ------ | -------------- |
| enableTLS | False | Boolean | 使用传输加密方式挂载。 说明：仅通用型 NAS 支持传输加密 |
| mountDir | True | String | 本地挂载目录 |
| serverAddr | True | String | NAS 服务器地址 |

## ossMountConfig

当`ossMountConfig`参数为结构时，可以参考：

| 参数名                         | 必填 | 类型                             | 参数描述       |
| ------------------------------ | ---- | -------------------------------- | -------------- |
| [mountPoints](#ossMountPoints) | True | [List\<Struct>](#ossMountPoints) | OSS 挂载点列表 |

### 权限配置相关

#### 子账号需要的权限

##### 最大权限

**系统策略**：`AliyunFCFullAccess`

##### 部署最小权限

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
  ],
  "Version": "1"
}
```

#### 函数角色权限

##### 最大权限

**系统策略**：`AliyunOSSFullAccess`

##### 限定只读访问指定 bucket

```
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "oss:ListObjects",
        "oss:GetObject"
      ],
      "Resource": [
        "acs:oss:*:*:bucketName",
        "acs:oss:*:*:bucketName/*"
      ],
      "Effect": "Allow"
    }
  ]
}
```

##### 限定读写访问指定 bucket

```
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "oss:ListObjects",
        "oss:GetObject",
        "oss:PutObject",
        "oss:DeleteObject",
        "oss:AbortMultipartUpload",
        "oss:ListParts"
      ],
      "Resource": [
        "acs:oss:*:*:bucketName",
        "acs:oss:*:*:bucketName/*"
      ],
      "Effect": "Allow"
    }
  ]
}
```

### ossMountPoints

| 参数名     | 必填  | 类型    | 参数描述                                                        |
| ---------- | ----- | ------- | --------------------------------------------------------------- |
| bucketName | True  | String  | OSS bucket 名称                                                 |
| bucketPath | False | String  | 挂载的 OSS Bucket 路径。留空或者填`/`，都表示挂载 bucket 根目录 |
| endpoint   | True  | String  | OSS 访问地址                                                    |
| mountDir   | True  | String  | 挂载目录                                                        |
| readOnly   | False | Boolean | 是否只读                                                        |

## runtime

runtime 目前支持

`nodejs14`、`nodejs12`、`nodejs10`、`nodejs8`  
`python3.10`、`python3.9`、`python3`
`java11`、`java8`  
`go1`  
`php7.2`  
`dotnetcore3.1`  
`custom`、`custom.debian10`、`custom-container`

## tracingConfig

| 参数名 | 必填 | 类型   | 参数描述                                                                                          |
| ------ | ---- | ------ | ------------------------------------------------------------------------------------------------- |
| params | True | String | 链路追踪内网接入点。 例如 http://tracing-analysis-dc-hz.aliyuncs.com/adapt_xxx/api/otlp/traces 。 |
| type   | True | String | 链路追踪协议类型，目前只支持 Jaeger。                                                             |

### 权限配置相关

#### 子账号需要的权限

**系统策略**：`AliyunFCFullAccess`、`AliyunTracingAnalysisReadOnlyAccess`

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
  ],
  "Version": "1"
}
```

## vpcBinding

| 参数名 | 必填 | 类型           | 参数描述                     |
| ------ | ---- | -------------- | ---------------------------- |
| vpcIds | True | List\<String\> | 允许访问该函数的 vpc ID 列表 |

## vpcConfig

当`vpcConfig`参数为简单配置是，可以是：`auto`。在部署阶段会先检测线上是否存在 vpcConfig 的配置，如果存在则直接复用，如果不存在则尝试按照以下规则复用或者创建资源：

- vpcId 的名称是 `Alibaba-Fc-V3-Component-Generated-vpc-${this.region}`，当如果存在多个符合规则的 vpc，会复用第一个返回值。在创建时 cidrBlock 固定为 `10.0.0.0/8`。
- vswitch 的名称是 `Alibaba-Fc-V3-Component-Generated-vswitch-${this.region}`，当如果存在多个符合规则的 vswitch，会复用第一个返回值。
- securityGroup 的名称是 `Alibaba-Fc-V3-Component-Generated-securityGroup-${this.region}`，当如果存在多个符合规则的 securityGroup，会复用第一个返回值。

当`vpcConfig`参数为结构时，可以参考：

| 参数名          | 必填 | 类型           | 参数描述       |
| --------------- | ---- | -------------- | -------------- |
| securityGroupId | True | String         | 安全组 ID      |
| vpcId           | True | String         | VPC ID         |
| vswitchIds      | True | List\<String\> | 交换机 ID 列表 |

### 权限配置相关

#### 子账号需要的权限

##### 最大权限

**系统策略**：`AliyunFCFullAccess`、`AliyunVPCFullAccess`、`AliyunECSFullAccess`

##### 部署最小权限

- 当 `vpcConfig` 不为 `auto`

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
  ],
  "Version": "1"
}
```

- 当 `vpcConfig` 为 `auto`

**系统策略**：`AliyunVPCReadOnlyAccess`

**自定义策略**

```json
{
  "Statement": [
    {
      "Action": "ram:PassRole",
      "Resource": "*",
      "Effect": "Allow",
      "Condition": {
        "StringEquals": {
          "acs:Service": "fc.aliyuncs.com"
        }
      }
    }
    {
      "Action": "fc:GetAccountSettings",
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:account-settings"
    },
    {
      "Action": [
        "vpc:CreateVpc",
        "vpc:CreateVSwitch",
        "ecs:AuthorizeSecurityGroup",
        "ecs:DescribeSecurityGroups",
        "ecs:CreateSecurityGroup"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ],
  "Version": "1"
}
```

## asyncInvokeConfig

| 参数名                                  | 必填  | 类型                         | 参数描述                                                |
| --------------------------------------- | ----- | ---------------------------- | ------------------------------------------------------- |
| [destinationConfig](#destinationConfig) | True  | [Struct](#destinationConfig) | 异步调用目标的配置结构体                                |
| maxAsyncEventAgeInSeconds               | False | Number                       | 消息最大存活时长，取值范围[1,2592000]。单位：秒         |
| maxAsyncRetryAttempts                   | False | Number                       | 异步调用失败后的最大重试次数，默认值为 3。取值范围[0,8] |

### destinationConfig

| 参数名    | 必填 | 类型                   | 参数描述               |
| --------- | ---- | ---------------------- | ---------------------- |
| onSuccess | True | [Struct](#destination) | 异步调用成功的目标服务 |
| onFailure | True | [Struct](#destination) | 异步调用失败的目标服务 |

#### destination

| 参数名      | 必填 | 类型   | 参数描述                                                          |
| ----------- | ---- | ------ | ----------------------------------------------------------------- |
| destination | True | String | 异步调用目标资源描述符，例如`acs:fc:cn-shanghai:xxx:functions/f1` |
