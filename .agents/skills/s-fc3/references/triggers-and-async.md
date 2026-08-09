# 触发器与异步

## 触发器

`triggers` 是数组，`qualifier` 通常指向版本或别名。HTTP、定时、OSS、CDN、EventBridge 等都在这里配置。

| 类型 | 场景 | 常见字段 |
|------|------|----------|
| `http` | HTTP/HTTPS 入口 | `triggerConfig.authType`, `methods`, `disableURLInternet` |
| `timer` | 定时任务 | `triggerConfig.cronExpression`, `enable`, `payload` |
| `oss` | OSS 事件 | `invocationRole`, `sourceArn`, `triggerConfig.events`, `filter` |
| `cdn_events` | CDN 事件通知 | `invocationRole`, `sourceArn`, `triggerConfig.eventName`, `filter` |
| `eventbridge` | EventBridge 事件 | 事件总线 / 事件源配置 |
| `log` | 日志触发 | 按日志投递触发 |
| `mns_topic` | MNS 主题 | 主题投递触发 |
| `tablestore` | TableStore 事件 | 表变更触发 |

## 触发器示例

```yaml
triggers:
  - triggerName: http
    triggerType: http
    qualifier: LATEST
    triggerConfig:
      authType: anonymous
      methods: [GET, POST]
      disableURLInternet: false

  - triggerName: timer1
    triggerType: timer
    qualifier: LATEST
    triggerConfig:
      cronExpression: '0 0 8 * * *'
      enable: true
      payload: 'timer-event'
```

## 异步调用

`asyncInvokeConfig` 用于重试、存活时间和投递目标。

```yaml
props:
  asyncInvokeConfig:
    maxAsyncEventAgeInSeconds: 86400
    maxAsyncRetryAttempts: 3
    statefulInvocation: false
    # destinationConfig: 见官方文档
```

## 部署建议

- 触发器通常和函数一起用 `s deploy` 部署。
- 只改触发器时可用 `s deploy --trigger ...`。
- 只改异步调用配置时可用 `s deploy --async-invoke-config`。
- 删除时顺序通常是异步配置 → 触发器 → 版本 / 别名 / 函数。

## 事件模板

各触发器事件示例见官方 `event-template` 仓库。处理触发器 payload 时，先拿模板做本地回放，再接线上事件。
