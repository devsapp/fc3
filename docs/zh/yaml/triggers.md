---
title: triggers字段
description: 'triggers字段'
position: 2
category: 'Yaml规范'
---

## triggers 字段

| 参数名         | 必填  | 类型   | 参数描述                                                                                                 |
| -------------- | ----- | ------ | -------------------------------------------------------------------------------------------------------- |
| invocationRole | False | String | 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限 |
| qualifier      | False | String | 触发器函数的版本或者别名，默认 `LATEST`                                                                  |
| sourceArn      | False | String | 触发器事件源的 ARN                                                                                       |
| triggerConfig  | True  | Struct | 触发器配置，针对不同类型的触发器，配置有所不同。                                                         |
| triggerName    | True  | String | 触发器名称                                                                                               |
| triggerType    | True  | Enum   | 触发器类型                                                                                               |

type 目前支持：`http`, `timer`, `oss`, `log`, `mns_topic`, `cdn_events`, `tablestore`, `eventbridge`

### Http 触发器

| 参数名             | 必填  | 类型           | 参数描述                                                               |
| ------------------ | ----- | -------------- | ---------------------------------------------------------------------- |
| authType           | True  | String         | 鉴权类型，可选值：anonymous、function                                  |
| disableURLInternet | False | Boolean        | 是否禁用公网访问 URL，默认为 false                                     |
| methods            | True  | List\<String\> | HTTP 触发器支持的访问方法，可选值：GET、POST、PUT、DELETE、PATCH、HEAD |

#### 权限配置相关

##### 子账号需要的函数权限

###### 最大权限

`AliyunFCFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:DeleteTrigger",
        "fc:UpdateTrigger",
        "fc:ListTriggers"
      ],
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:functions/<functionName>/triggers/<triggerName>"
    }
  ]
}
```

### Timer 触发器

| 参数名         | 必填  | 类型    | 参数描述                                            |
| -------------- | ----- | ------- | --------------------------------------------------- |
| cronExpression | True  | String  | 时间触发器表达式，支持两种设置：@every、cron 表达式 |
| enable         | True  | Boolean | 是否启用该触发器                                    |
| payload        | False | String  | 代表触发器事件本身的输入内容                        |

#### 权限配置相关

##### 子账号需要的函数权限

###### 最大权限

`AliyunFCFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:DeleteTrigger",
        "fc:UpdateTrigger",
        "fc:ListTriggers"
      ],
      "Effect": "Allow",
      "Resource": "acs:fc:<region>:<account-id>:functions/<functionName>/triggers/<triggerName>"
    }
  ]
}
```

### OSS 触发器

| 参数名            | 必填 | 类型              | 参数描述                                                                                                        |
| ----------------- | ---- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| events            | True | List\<String\>    | OSS 端触发函数执行的事件列表， 参考文档：https://help.aliyun.com/document_detail/62922.html#section-mf3-l4l-1nf |
| [filter](#filter) | True | [Struct](#filter) | 触发条件                                                                                                        |

#### 权限配置相关

##### 子账号权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunOSSFullAccess`

###### 操作最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Action": [
        "oss:ListBucket",
        "oss:GetBucketEventNotification",
        "oss:PutBucketEventNotification",
        "oss:DeleteBucketEventNotification"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": ["fc:InvokeFunction"],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```

#### filter

| 参数名 | 必填 | 类型           | 参数描述 |
| ------ | ---- | -------------- | -------- |
| key    | True | [Struct](#Key) | 键值     |

##### Key

| 参数名 | 必填 | 类型   | 参数描述 |
| ------ | ---- | ------ | -------- |
| prefix | True | String | 前缀     |
| suffix | True | String | 后缀     |

### Log 触发器

| 参数名                                  | 必填 | 类型                         | 参数描述                                                       |
| --------------------------------------- | ---- | ---------------------------- | -------------------------------------------------------------- |
| enable                                  | True | Boolean                      | 触发器开关                                                     |
| [functionParameter](#functionParameter) | True | [Struct](#functionParameter) | 该参数将作为函数 Event 的 Parameter 传入函数。默认值为空（{}） |
| [jobConfig](#jobConfig)                 | True | [Struct](#jobConfig)         | job 配置                                                       |
| [logConfig](#logConfig-1)               | True | [Struct](#logConfig-1)       | 日志配置                                                       |

| [sourceConfig](#sourceConfig) | True | [Struct](#sourceConfig) | source 配置 |

#### 权限配置相关

##### 子账号权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunLogFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Effect": "Allow",
      "Action": ["log:GetEtlJob", "log:UpdateEtlJob", "log:CreateEtlJob", "log:DeleteEtlJob"],
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": ["fc:InvokeFunction"],
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Action": [
        "log:Get*",
        "log:List*",
        "log:PostProjectQuery",
        "log:PutProjectQuery",
        "log:DeleteProjectQuery",
        "log:GetProjectQuery",
        "log:PostLogStoreLogs",
        "log:BatchPostLogStoreLogs",
        "log:CreateConsumerGroup",
        "log:UpdateConsumerGroup",
        "log:DeleteConsumerGroup",
        "log:ListConsumerGroup",
        "log:ConsumerGroupUpdateCheckPoint",
        "log:ConsumerGroupHeartBeat",
        "log:GetConsumerGroupCheckPoint"
      ],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```

#### logConfig

| 参数名   | 必填 | 类型   | 参数描述                                                         |
| -------- | ---- | ------ | ---------------------------------------------------------------- |
| logstore | True | String | 日志仓库名称，日志服务触发函数执行过程的日志会记录到该日志仓库中 |
| project  | True | String | 日志项目名称                                                     |

#### jobConfig

| 参数名          | 必填  | 类型   | 参数描述                                                                          |
| --------------- | ----- | ------ | --------------------------------------------------------------------------------- |
| maxRetryTime    | False | String | 表示日志服务触发函数执行时，如果遇到错误，所允许的最大尝试次数，取值范围：[0,100] |
| triggerInterval | False | String | 日志服务触发函数运行的时间间隔，取值范围：[3,600]，单位：秒                       |

#### sourceConfig

| 参数名   | 必填 | 类型   | 参数描述                                                   |
| -------- | ---- | ------ | ---------------------------------------------------------- |
| logstore | True | String | 触发器会定时从该日志仓库中订阅数据到函数服务进行自定义加工 |

#### functionParameter

Object 格式，例如：

```
TempKey: tempValue
```

### MNS 触发器

| 参数名              | 必填  | 类型   | 参数描述                                                                                                                  |
| ------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| filterTag           | False | String | 描述了该订阅中消息过滤的标签（标签一致的消息才会被推送）,不超过 16 个字符的字符串，默认不进行消息过滤，即默认不填写该字段 |
| notifyContentFormat | False | String | 推送给函数入参 event 的格式，可选值：STREAM, JSON                                                                         |
| notifyStrategy      | False | String | 调用函数的重试策略，可选值：BACKOFF_RETRY, EXPONENTIAL_DECAY_RETRY                                                        |

#### 权限配置相关

##### 子账号需要的函数权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunMNSFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Effect": "Allow",
      "Action": ["mns:Subscribe", "mns:Unsubscribe"],
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": ["fc:InvokeFunction"],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```

### CDN 触发器

| 参数名              | 必填 | 类型                | 参数描述                                          |
| ------------------- | ---- | ------------------- | ------------------------------------------------- |
| eventName           | True | String              | 为 CDN 端触发函数执行的事件，一经创建不能更改     |
| eventVersion        | True | String              | 为 CDN 端触发函数执行事件的版本，一经创建不能更改 |
| notes               | True | String              | 备注信息                                          |
| [filter](#filter-1) | True | [Struct](#filter-1) | 过滤器（至少需要一个过滤器）                      |

#### 权限配置相关

##### 子账号权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunCDNFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Effect": "Allow",
      "Action": [
        "cdn:UpdateFCTrigger",
        "cdn:DeleteFCTrigger",
        "cdn:DescribeFCTrigger",
        "cdn:AddFCTrigger"
      ],
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": ["fc:InvokeFunction"],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```

#### filter

| 参数名 | 必填 | 类型           | 参数描述         |
| ------ | ---- | -------------- | ---------------- |
| domain | True | List\<String\> | 过滤参数值的集合 |

### Tablestore 触发器

Tabletore 触发器的 triggerConfig 无需包含任何参数，但必填，为空 Object`{}`即可。

#### 权限配置相关

##### 子账号需要的函数权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunOTSFullAccess`

###### 最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Effect": "Allow",
      "Action": ["ots:GetTrigger", "ots:UpdateTrigger", "ots:CreateTrigger", "ots:DeleteTrigger"],
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": ["ots:BatchGet*", "ots:Describe*", "ots:Get*", "ots:List*"],
      "Resource": "*",
      "Effect": "Allow"
    },
    {
      "Action": ["fc:InvokeFunction"],
      "Resource": "*",
      "Effect": "Allow"
    }
  ]
}
```

### EventBridge 触发器

| 参数名                                  | 必填  | 类型                         | 参数描述                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------- | ----- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| asyncInvocationType                     | False | Boolean                      | 触发器调用函数的方式。目前支持同步调用以及异步调用                                                                                                                                                                                                                                                                                                                                                           |
| eventRuleFilterPattern                  | True  | String                       | 事件模式。JSON 格式，详细规则可以参考 [EventBridge 事件模式官方文档](https://help.aliyun.com/document_detail/181432.html)                                                                                                                                                                                                                                                                                    |
| [eventSinkConfig](#eventSinkConfig)     | False | [Struct](#eventSinkConfig)   | 事件目标配置                                                                                                                                                                                                                                                                                                                                                                                                 |
| [eventSourceConfig](#eventSourceConfig) | True  | [Struct](#eventSourceConfig) | 事件源配置                                                                                                                                                                                                                                                                                                                                                                                                   |
| [runOptions](#runOptions)               | False | [Struct](#runOptions)        | 触发器运行时参数                                                                                                                                                                                                                                                                                                                                                                                             |
| triggerEnable                           | False | Boolean                      | 触发器禁用开关。对于 event-driven 事件投递模型，等同于 EventBridge 侧对应事件规则的[禁用开关](https://help.aliyun.com/document_detail/163710.html#section-bnw-ofn-u8d)；对于 event-streaming 事件投递模型，等同于 EventBridge 侧对应事件流的启动/停止开关，**由于事件流启动/停止需要一段时间，因此只有事件流成功启动后，读取到的 triggerEnable 字段才会是 true,其他情况下读取到的 triggerEnable 均为 false** |

#### 权限配置相关

##### 子账号权限

###### 最大权限

`AliyunFCFullAccess`、`AliyunEventBridgeFullAccess`

###### 操作最小权限

```json
{
  "Version": "1",
  "Statement": [
    {
      "Action": [
        "fc:GetTrigger",
        "fc:CreateTrigger",
        "fc:UpdateTrigger",
        "fc:DeleteTrigger",
        "fc:ListTriggers"
      ],
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
    },
    {
      "Action": [
        "eventbridge:CreateEventBus",
        "eventbridge:GetEventBus",
        "eventbridge:DeleteEventBus",
        "eventbridge:CreateRule",
        "eventbridge:GetRule",
        "eventbridge:UpdateRule",
        "eventbridge:EnableRule",
        "eventbridge:DisableRule",
        "eventbridge:DeleteRule",
        "eventbridge:ListRules",
        "eventbridge:UpdateTargets",
        "eventbridge:DeleteTargets",
        "eventbridge:ListTargets"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

##### 触发器角色权限

EventBridge 触发器创建时无需指定 role，但是需要在开通 [EventBridge](https://eventbridge.console.aliyun.com) 产品后，进行 SLR 授权，授权方式有如下两种：

- 在控制台点击授权
- 通过 terraform 进行授权，terraform 授权代码如下所示：

```
provider "alicloud" {
  access_key = "${alicloud_access_key}"
  secret_key = "${aliclou_secret_key}"
  region     = "cn-hangzhou"
}


resource "alicloud_event_bridge_service_linked_role" "service_linked_role" {
  product_name = "AliyunServiceRoleForEventBridgeSendToFC"
}
```

#### eventSourceConfig

| 参数名                                          | 必填  | 类型                             | 参数描述                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [eventSourceParameters](#eventSourceParameters) | False | [Struct](#eventSourceParameters) | 自定义事件源参数，自定义事件源包括：MNS，RocketMQ，RabbitMQ，Kafka                                                                                                                                                                                                                                                                                          |
| eventSourceType                                 | True  | String                           | 触发器事件源类型，目前支持如下几种触发源：<br> 1. Default：表示 EventBridge 官方触发源<br> 2. MNS：消息队列 MNS 队列作为触发源<br> 3. RocketMQ：消息队列 RockerMQ 作为触发源<br> 4. RabbitMQ：消息队列 RabbitMQ 作为触发源<br> 5. Kafka: 消息队列 Kafka 作为触发源<br> 6. DTS: 数据传输服务 DTS 作为触发源<br> 注：该字段不可更新，更新时传入该字段将被忽略 |

#### eventSourceParameters

| 参数名                                                | 必填  | 类型                                | 参数描述                                     |
| ----------------------------------------------------- | ----- | ----------------------------------- | -------------------------------------------- |
| [sourceMNSParameters](#sourceMNSParameters)           | False | [Struct](#sourceMNSParameters)      | 事件源为消息服务 MNS 时的自定义参数配置      |
| [sourceRocketMQParameters](#sourceRocketMQParameters) | False | [Struct](#sourceRocketMQParameters) | 事件源为消息服务 RockerMQ 时的自定义参数配置 |
| [sourceRabbitMQParameters](#sourceRabbitMQParameters) | False | [Struct](#sourceRabbitMQParameters) | 事件源为消息服务 RabbitMQ 时的自定义参数配置 |
| [sourceKafkaParameters](#sourceKafkaParameters)       | False | [Struct](#sourceKafkaParameters)    | 事件源为消息队列 Kafka 时的自定义参数配置    |
| [sourceDTSParameters](#sourceDTSParameters)           | False | [Struct](#sourceDTSParameters)      | 事件源为数据传输服务 DTS 时的自定义参数配置  |

#### sourceMNSParameters

| 参数名         | 必填  | 类型    | 参数描述                          |
| -------------- | ----- | ------- | --------------------------------- |
| IsBase64Decode | False | Boolean | 是否开启 Base64 编码。默认为 true |
| QueueName      | True  | String  | 消息服务 MNS 的 Queue 的名称      |

#### sourceRocketMQParameters

| 参数名     | 必填  | 类型   | 参数描述                                                                                                                                                           |
| ---------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GroupID    | True  | String | 消息队列 RocketMQ 版的 Group ID                                                                                                                                    |
| InstanceId | True  | String | 消息队列 RocketMQ 版的实例 ID。更多信息，请参见[使用限制](https://help.aliyun.com/document_detail/85006.htm?spm=a2c4g.11186623.0.0.31b96401luYFDO#concept-2047059) |
| RegionId   | False | String | 消息队列 RocketMQ 版的实例所属地域                                                                                                                                 |
| Timestamp  | False | Number | 时间戳。仅当参数 Offset 取值为 CONSUME_FROM_TIMESTAMP 时，该参数有效                                                                                               |
| Topic      | True  | String | 消息队列 RocketMQ 版实例的 Topic 名称。更多信息，请参见[使用限制](https://help.aliyun.com/document_detail/85006.htm#concept-2047059)                               |

#### sourceRabbitMQParameters

| 参数名          | 必填  | 类型   | 参数描述                                                                                                                                  |
| --------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| InstanceId      | True  | String | 消息队列 RabbitMQ 版的实例的 ID。更多信息，请参见[使用限制](https://help.aliyun.com/document_detail/101627.htm#concept-101627-zh)         |
| QueueName       | True  | String | 消息队列 RabbitMQ 版实例的 Queue 的名称。更多信息，请参见[使用限制](https://help.aliyun.com/document_detail/101627.htm#concept-101627-zh) |
| RegionId        | False | String | 消息服务 MNS Queue 所属地域                                                                                                               |
| VirtualHostName | True  | String | 消息队列 RabbitMQ 版实例的 Vhost 的名称。更多信息，请参见[使用限制](https://help.aliyun.com/document_detail/101627.htm#concept-101627-zh) |

#### sourceKafkaParameters

| 参数名          | 必填  | 类型   | 参数描述                                                                                           |
| --------------- | ----- | ------ | -------------------------------------------------------------------------------------------------- |
| ConsumerGroup   | True  | String | 消息队列 Kafka 版的资源组 ID                                                                       |
| InstanceId      | True  | String | 消息队列 Kafka 版的实例 ID                                                                         |
| Network         | False | String | 所用网络类型，可选值有 PublicNetwork 以及 Default，前者表示使用自建 vpc 网络，后者表示使用默认公网 |
| OffsetReset     | True  | String | 消息的消费位点，可选值有 latest 和 earliest，分别表示最新位点以及最早位点                          |
| RegionId        | False | String | 消息队列 Kafka 版的实例所属地域                                                                    |
| SecurityGroupId | False | String | 所用 vpc 网络的安全组 ID，网络类型为 PublicNetwork 时配置                                          |
| Topic           | True  | String | 消息队列 Kafka 版的 Topic 名称                                                                     |
| VpcId           | False | String | 所用 vpc 网络的 ID，网络类型为 PublicNetwork 时配置                                                |
| VSwitchIds      | False | String | 所用 vpc 网络的交换机 ID，网络类型为 PublicNetwork 时配置                                          |

#### sourceDTSParameters

| 参数名         | 必填 | 类型   | 参数描述                                                                     |
| -------------- | ---- | ------ | ---------------------------------------------------------------------------- |
| BrokerUrl      | True | String | 数据订阅任务的网络连接地址                                                   |
| InitCheckPoint | True | Number | 期望消费第一条数据的时间戳，单位是秒。消费位点必须在订阅实例的数据范围之内。 |
| Password       | True | String | 创建消费组时设置的密码                                                       |
| RegionId       | True | String | 数据传输服务 DTS 任务所属地域                                                |
| Sid            | True | String | 数据订阅消费组 ID                                                            |
| TaskId         | True | String | DTSJobId                                                                     |
| Topic          | True | String | 数据订阅任务的 Topic                                                         |
| Username       | True | String | 创建消费组时设置的账号                                                       |

#### eventSinkConfig

| 参数名                            | 必填 | 类型                      | 参数描述     |
| --------------------------------- | ---- | ------------------------- | ------------ |
| [deliveryOption](#deliveryOption) | True | [Struct](#deliveryOption) | 事件投递参数 |

##### deliveryOption

| 参数名      | 必填  | 类型   | 参数描述                                                                                                                                                                                                                                                     |
| ----------- | ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| mode        | False | String | 事件投递模型，该参数与 [runOptions](#runOptions) 中的 mode 参数含义相同，但是优先级更低，不推荐使用                                                                                                                                                          |
| eventSchema | False | String | 指定函数入口参数 event 中每个数据元素的格式，有如下两种取值模式：<br> - CloudEvents: 以通用格式描述事件数据的规范，旨在简化不同服务、平台间的事件声明和传输<br> - RawData: 只投递 CloudEvents 中 $data 引用的数据，不包含 CloudEvents 格式中的其它元数据信息 |

#### runOptions

| 参数名                              | 必填  | 类型                       | 参数描述                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ----- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [batchWindow](#batchWindow)         | False | [Struct](#batchWindow)     | 调用函数时的批处理参数                                                                                                                                                                                                                                                                                                                                                                                    |
| [deadLetterQueue](#deadLetterQueue) | False | [Struct](#deadLetterQueue) | 死信队列配置，若配置了该配置，超过重试策略后的事件将被放入该队列中                                                                                                                                                                                                                                                                                                                                        |
| errorsTolerance                     | False | String                     | 容错策略，即发生错误时是否选择容错。取值说明如下：<br>ALL: 允许容错<br>NONE: 禁止容错                                                                                                                                                                                                                                                                                                                     |
| maximumTasks                        | False | String                     | 并发消费者数量，只有在指定 Kafka 事源时该参数有效                                                                                                                                                                                                                                                                                                                                                         |
| mode                                | True  | String                     | 事件投递模型，优先级比 EventSinkConfig.DeliveryOption.mode 更高，可选值有 event-driven 以及 event-streaming，前者是事件驱动模型，底层由 eventbridge 的[事件总线](https://help.aliyun.com/document_detail/163897.html)进行实现；后者是事件流模型，底层由 eventbridge 的[事件流](https://help.aliyun.com/document_detail/329940.html)进行实现。**runOptions 中参数只有在 mode 为 event-streaming 时才有效** |
| [retryStrategy](#retryStrategy)     | False | [Struct](#retryStrategy)   | 事件推送失败时的重试策略相关参数                                                                                                                                                                                                                                                                                                                                                                          |

##### batchWindow

| 参数名           | 必填  | 类型   | 参数描述                                                                                                                            |
| ---------------- | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| CountBasedWindow | False | String | 一次调用函数发送的最大批量消息条数，当积压的消息数量到达设定值时才会发送请求，取值范围为 [1, 10000]。例如 1。                       |
| TimeBasedWindow  | False | String | 调用函数的间隔时间，系统每到间隔时间点会将消息聚合后发给函数计算，取值范围为 [0,15]，单位秒。0 秒表示无等待时间，直接投递。例如 3。 |

##### deadLetterQueue

| 参数名 | 必填 | 类型   | 参数描述       |
| ------ | ---- | ------ | -------------- |
| Arn    | True | String | 死信队列的 Arn |

##### retryStrategy

| 参数名                   | 必填  | 类型   | 参数描述                                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MaximumEventAgeInSeconds | False | String | 事件消息的最大存活时间，单位是秒                                                                                                                                                                                                                                                                                                                   |
| MaximumRetryAttempts     | False | String | 事件消息的最大存活时间，单位是秒                                                                                                                                                                                                                                                                                                                   |
| PushRetryStrategy        | True  | String | 事件推送失败时的重试策略，取值说明如下: <br>BACKOFF_RETRY: 退避重试策略。重试 3 次，每次重试的间隔时间是 10 秒到 20 秒之间的随机值。<br>EXPONENTIAL_DECAY_RETRY: 指数衰减重试。重试 176 次，每次重试的间隔时间指数递增至 512 秒，总计重试时间为 1 天；每次重试的具体间隔为：1，2，4，8，16，32，64，128，256，512，512...512 秒（共 167 个 512）。 |
