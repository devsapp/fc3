# 发布与运维

## 版本

```bash
s version list
s version publish --description "v1.0"
s version remove --version-id 1
```

## 别名

```bash
s alias list [--table]
s alias get --alias-name pre
s alias publish --alias-name prod --version-id 1
s alias publish --alias-name prod --version-id latest
s alias publish --alias-name prod --version-id 2 --vw '{"1":0.2}'
s alias remove --alias-name prod
```

## 弹性实例

- 优先用 `scaling`，`provision` 仅存量可用。
- `s deploy` 会下发 `scalingConfig`；后续独立调参用 `s scaling`。

```bash
s scaling list
s scaling get --qualifier LATEST
s scaling put --qualifier LATEST --min-instances 2
s scaling remove --qualifier LATEST
```

```json
[{"name":"morning","startTime":"2024-01-01T00:00:00Z","endTime":"2024-12-31T00:00:00Z","target":20,"scheduleExpression":"cron(0 30 8 * * *)"}]
```

```json
[{"name":"cpu-tracking","startTime":"2024-01-01T00:00:00Z","endTime":"2024-12-31T00:00:00Z","metricType":"CPUUtilization","metricTarget":0.6,"minInstances":5,"maxInstances":50}]
```

## 预留

```bash
s provision list
s provision get --qualifier prod
s provision put --qualifier prod --default-target 10
s provision put --qualifier prod --default-target 0
s provision remove --qualifier prod
```

## 并发上限

```bash
s concurrency get
s concurrency put --reserved-concurrency 10
s concurrency remove
```

- `reservedConcurrency` 作用于整函数，不会按别名自动拆分。

## 层

```bash
s layer list [--public] [--official] [--table]
s layer publish --layer-name my-layer --code ./layer-code --compatible-runtime python3.10,nodejs20
s layer info --layer-name my-layer --version-id 1
s layer versions --layer-name my-layer
s layer download --layer-name my-layer --version-id 1
s layer acl --layer-name my-layer --public
s layer remove --layer-name my-layer [--version-id 1]
```

| 运行时 | 层内目录 |
|--------|----------|
| Python | `/opt/python` |
| Node.js | `/opt/nodejs/node_modules` |
| Java | `/opt/java/lib` |
| PHP | `/opt/php` |
| 其他非 Custom Runtime/Container 运行时 | `/opt/bin`、`/opt/lib` |

## 会话

```bash
s cli fc3 session create --region cn-hangzhou --function-name my-func --qualifier LATEST
s cli fc3 session create --region cn-hangzhou --function-name my-func --qualifier LATEST --session-ttl-in-seconds 600 --session-idle-timeout-in-seconds 300
s cli fc3 session list --region cn-hangzhou --function-name my-func
s cli fc3 session get --region cn-hangzhou --function-name my-func --session-id xxx --qualifier LATEST
s cli fc3 session update --region cn-hangzhou --function-name my-func --session-id xxx --qualifier LATEST --session-ttl-in-seconds 900
s cli fc3 session remove --region cn-hangzhou --function-name my-func --session-id xxx --qualifier LATEST
```

## 发布顺序

- 先发布版本。
- 再把别名指到版本。
- 再配 `scaling`。
- 最后再调 `concurrency`。
- `LATEST` 适合测试，生产建议用别名 + 固定版本。
