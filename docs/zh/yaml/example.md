---
title: Yaml完整配置示例
description: 'Yaml完整配置示例'
position: 3
category: 'Yaml规范'
---

# Yaml 完整配置示例

如果您使用 VsCode 开发， 推荐您配置[智能提示和检测](../intelligent.md)

阿里云函数计算（fc3）组件的 Yaml 字段如下：

```yaml
edition: 3.0.0 #  命令行YAML规范版本，遵循语义化版本（Semantic Versioning）规范
name: hello-world-app #  项目名称
access: default #  秘钥别名

resources:
  fcDemo: # 业务名称/模块名称
    component: fc3 # 组件名称
    props: # 组件的属性值
      region: cn-hangzhou
      code: './code' # 文件夹或者 zip 文件
      # code:
      #   ossBucketName: string
      #   ossObjectName: string
      cpu: 0.5
      customContainerConfig:
        command:
          - string
        entrypoint:
          - string
        healthCheckConfig:
          failureThreshold: 0
          httpGetUrl: string
          initialDelaySeconds: 0
          periodSeconds: 0
          successThreshold: 0
          timeoutSeconds: 0
        image: string
        port: 0
      customDNS:
        dnsOptions:
          - name: string
            value: string
        nameServers:
          - string
        searches:
          - string
      customRuntimeConfig:
        args:
          - string
        command:
          - string
        healthCheckConfig:
          failureThreshold: 0
          httpGetUrl: string
          initialDelaySeconds: 0
          periodSeconds: 0
          successThreshold: 0
          timeoutSeconds: 0
        port: 0
      description: string
      diskSize: 512 # 可选值: 512 | 10240
      instanceConcurrency: 1 # # 该参数仅针对 custom/custom.debian10/custom-container runtime 有效，范围为 [1, 100]
      environmentVariables:
        additionalProp1: string
        additionalProp2: string
        additionalProp3: string
      functionName: string
      gpuConfig:
        gpuMemorySize: 1024
        gpuType: string # 可选值: fc.gpu.tesla.1 | fc.gpu.ampere.1
      handler: string
      instanceLifecycleConfig:
        initializer:
          handler: string
          timeout: 1
        preStop:
          handler: string
          timeout: 1
      internetAccess: true
      layers:
        - string # layer arn, 比如 acs:fc:cn-huhehaote:123456789:layers/test-lh/versions/1
      logConfig:
        enableInstanceMetrics: true
        enableRequestMetrics: true
        logBeginRule: string # 可选值: DefaultRegex | None
        logstore: string
        project: string
      memorySize: 512
      nasConfig:
        groupId: 0
        userId: 0
        mountPoints:
          - enableTLS: true
            mountDir: string
            serverAddr: string
      ossMountConfig:
        mountPoints:
          - bucketName: string
            bucketPath: string
            endpoint: string
            mountDir: string
            readOnly: true
      role: string
      runtime: string
      timeout: 1
      tracingConfig:
        params: string
        type: string
      vpcBinding:
        vpcIds:
          - string
      vpcConfig:
        securityGroupId: string
        vSwitchIds:
          - string
        vpcId: string

      asyncInvokeConfig:
        destinationConfig:
          onFailure:
            destination: acs:mns:cn-huhehaote::/topics/serverless-devs-fc3-ci-test/messages
          onSuccess:
            destination: acs:fc:cn-huhehaote::functions/serverless-devs-ci-async-invoke-config-succ
        maxAsyncEventAgeInSeconds: 360
        maxAsyncRetryAttempts: 3

      triggers:
        - triggerName: httpTrigger # 触发器名称
          triggerType: http # 触发器类型
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            authType: anonymous # 鉴权类型，可选值：anonymous、function
            disableURLInternet: false # 是否禁用公网访问 URL
            methods: # HTTP 触发器支持的访问方法，可选值：GET、POST、PUT、DELETE、HEAD
              - GET
        - triggerName: timerTrigger # 触发器名称
          triggerType: timer # 触发器类型
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            cronExpression: '0 0 8 * * *' # 时间触发器表达式，支持两种设置：@every、cron 表达式
            enable: true # 是否启用该触发器
            payload: 'awesome-fc' # 代表触发器事件本身的输入内容
        - triggerName: ossTrigger # 触发器名称
          triggerType: oss # 触发器类型
          invocationRole: acs:ram::<account-id>:role/aliyunosseventnotificationrole # 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限
          sourceArn: acs:oss:<region>:<account-id>:<buckctName> # 触发器事件源的 ARN
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            events: # OSS 端触发函数执行的事件列表，参考文档：https://help.aliyun.com/document_detail/62922.html#section-mf3-l4l-1nf
              - oss:ObjectCreated:*
              - oss:ObjectRemoved:DeleteObject
            filter: # 触发条件
              key: # 键值
                prefix: source/ # 前缀
                suffix: .png # 后缀
        - triggerName: logTrigger # 触发器名称
          triggerType: log # 触发器类型
          invocationRole: acs:ram::<account-id>:role/aliyunlogetlrole # 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限
          sourceArn: acs:log:<region>:<account-id>:project/<projectName> # 触发器事件源的 ARN
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            logConfig: # 日志配置
              project: fass-demo # 日志项目名称
              logstore: fc-log # 日志仓库名称，日志服务触发函数执行过程的日志会记录到该日志仓库中
            jobConfig: # job配置
              maxRetryTime: 1 # 表示日志服务触发函数执行时，如果遇到错误，所允许的最大尝试次数，取值范围：[0,100]
              triggerInterval: 30 # 日志服务触发函数运行的时间间隔，取值范围：[3,600]，单位：秒
            sourceConfig: # source配置
              logstore: function-log # 触发器会定时从该日志仓库中订阅数据到函数服务进行自定义加工
            functionParameter: # 该参数将作为函数Event的Parameter传入函数。默认值为空（{}）
              key: val
            enable: true # 触发器开关
        - triggerName: mnsTrigger # 触发器名称
          triggerType: mns_topic # 触发器类型
          invocationRole: acs:ram::<account-id>:role/aliyunmnsnotificationrole # 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限
          sourceArn: acs:mns:<region>:<account-id>:/topics/test # 触发器事件源的 ARN
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            notifyContentFormat: 'JSON' # 推送给函数入参 event 的格式，可选值：STREAM, JSON
            notifyStrategy: 'BACKOFF_RETRY' # 调用函数的重试策略，可选值：BACKOFF_RETRY, EXPONENTIAL_DECAY_RETRY
            filterTag: abc # 描述了该订阅中消息过滤的标签（标签一致的消息才会被推送）,不超过 16 个字符的字符串，默认不进行消息过滤，即默认不填写该字段
        - triggerName: cdnTrigger # 触发器名称
          triggerType: cdn_events # 触发器类型
          invocationRole: acs:ram::<account-id>:role/aliyuncdneventnotificationrole # 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限
          sourceArn: acs:cdn:*:<account-id> # 触发器事件源的 ARN
          qualifier: LATEST # 触发函数的版本
          triggerConfig: # 触发器配置
            eventName: LogFileCreated # 为 CDN 端触发函数执行的事件，一经创建不能更改
            eventVersion: '1.0.0' # 为 CDN 端触发函数执行事件的版本，一经创建不能更改
            notes: cdn events trigger test # 备注信息
            filter: # 过滤器（至少需要一个过滤器）
              domain: # 过滤参数值的集合
                - 'www.taobao.com'
                - 'www.tmall.com'
        - triggerName: tablestoreTrigger # 触发器名称
          triggerType: tablestore # 触发器类型
          invocationRole: acs:ram::<account-id>:role/aliyuntablestorestreamnotificationrole # 使用一个 RAM 角色的 ARN 为函数指定执行角色，事件源会使用该角色触发函数执行，请确保该角色有调用函数的权限
          sourceArn: acs:ots:<region>:<account-id>:instance/<instance>/table/<table> # 触发器事件源的 ARN
          qualifier: LATEST # 触发函数的版本
          triggerConfig: {}
        # eb 触发器各种示例
        - triggerName: eventbridgeTriggerWithDefaultSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventbus/<eventBusName>/rule/<eventRuleName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{"source":["acs.oss"],"type":["oss:BucketCreated:PutBucket"]}'
            eventSourceConfig:
              eventSourceType: Default
        - triggerName: eventbridgeTriggerWithMNSSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventbus/<eventBusName>/rule/<eventRuleName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{"source":["MNS-${functionName}-eventbridgeTriggerWithMNSSource"]}'
            eventSourceConfig:
              eventSourceType: MNS
              eventSourceParameters:
                sourceMNSParameters:
                  QueueName: gjl-test
                  IsBase64Decode: false
        - triggerName: eventbridgeTriggerWithRocketMQSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventbus/<eventBusName>/rule/<eventRuleName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{"source":["RocketMQ-${functionName}-eventbridgeTriggerWithRocketMQSource"]}'
            eventSourceConfig:
              eventSourceType: RocketMQ
              eventSourceParameters:
                sourceRocketMQParameters:
                  RegionId: cn-hangzhou
                  InstanceId: MQ_INST_164901546557****_BAAN****
                  GroupID: GID_group1
                  Topic: mytopic
                  Timestamp: 1636597951984
        - triggerName: eventbridgeTriggerWithRabbitMQSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventbus/<eventBusName>/rule/<eventRuleName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{"source":["RabbitMQ-${functionName}-eventbridgeTriggerWithRabbitMQSource"]}'
            eventSourceConfig:
              eventSourceType: RabbitMQ
              eventSourceParameters:
                sourceRabbitMQParameters:
                  RegionId: cn-hangzhou
                  InstanceId: amqp-cn-******
                  QueueName: test-queue
                  VirtualHostName: test-virtual
        - triggerName: eventbridgeTriggerWithKafkaSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventstreaming/<eventStreamingName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{}'
            eventSinkConfig:
              deliveryOption:
                mode: event-streaming # event source 为 Kafka 时，只支持 event-streaming 模式
                eventSchema: CloudEvents
            runOptions:
              mode: event-streaming # event source 为 Kafka 时，只支持 event-streaming 模式
              maximumTasks: 3
              errorsTolerance: 'ALL'
              retryStrategy:
                PushRetryStrategy: 'BACKOFF_RETRY'
                MaximumEventAgeInSeconds: 0
                MaximumRetryAttempts: 0
              deadLetterQueue:
                Arn: acs:mns:cn-qingdao:123:/queues/queueName
              batchWindow:
                CountBasedWindow: 2
                TimeBasedWindow: 10
            eventSourceConfig:
              eventSourceType: Kafka
              eventSourceParameters:
                sourceKafkaParameters:
                  RegionId: cn-hangzhou
                  InstanceId: myInstanceID
                  Topic: myTopic
                  ConsumerGroup: myConsumerGroup
                  OffsetReset: latest
                  Network: PublicNetwork
                  VpcId: myVpcID
                  VSwitchIds: myVSwitchID
                  SecurityGroupId: mySecurityGroupID
        - triggerName: eventbridgeTriggerWithDTSSource
          # sourceArn: acs:eventbridge:<region>:<accountID>:eventstreaming/<eventStreamingName>
          triggerType: eventbridge
          qualifier: LATEST
          triggerConfig:
            triggerEnable: true
            asyncInvocationType: false
            eventRuleFilterPattern: '{}'
            eventSinkConfig:
              deliveryOption:
                eventSchema: CloudEvents # 支持 CloudEvents 以及 RawData 两种取值
            runOptions:
              mode: event-streaming
              maximumTasks: 3
              errorsTolerance: 'ALL'
              retryStrategy:
                PushRetryStrategy: 'BACKOFF_RETRY'
                MaximumEventAgeInSeconds: 0
                MaximumRetryAttempts: 0
              deadLetterQueue:
                Arn: acs:mns:cn-qingdao:123:/queues/queueName
              batchWindow:
                CountBasedWindow: 2
                TimeBasedWindow: 10
            eventSourceConfig:
              eventSourceType: DTS
              eventSourceParameters:
                sourceDTSParameters:
                  RegionId: cn-hangzhou
                  BrokerUrl: dts-cn-shanghai-vpc.aliyuncs.com:18003 # 数据订阅任务的网络连接地址
                  Topic: cn_shanghai_vpc_rm_uf6398ykj0218rk6t_dts_trigger_upgrade_from_old_version2 # 数据订阅任务的 Topic
                  Sid: dtse34j22j025aq26p # 数据订阅消费组 ID
                  Username: dts_trigger # 创建消费组时设置的账号
                  Password: dtsTest123 # 创建消费组时设置的密码
                  InitCheckPoint: 1677340805 # 期望消费第一条数据的时间戳。消费位点必须在订阅实例的数据范围之内
                  TaskId: e34z2gm325qp37m # DTSJobId
```
