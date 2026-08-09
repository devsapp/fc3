# s-fc3

阿里云函数计算 FC3 + Serverless Devs (`s` CLI + `fc3` 组件) 的 Agent Skill。

用自然语言操作阿里云函数计算：查函数列表、调用函数、查日志、看实例、管理版本别名灰度、配置弹性伸缩、触发器、VPC/NAS、自定义域名等。

## 快速开始

```bash
npm i -g @serverless-devs/s
s config add   # 配阿里云 AccessKey
```

## 使用示例

以下对话来自与 Agent 的真实交互（杭州区域，`access: default`）：

### 查函数列表

```
❯ 帮我查看下阿里云杭州 test 为前缀的函数有哪些
```

Agent 自动执行 `s cli fc3 list --region cn-hangzhou -o json --silent`，筛选出所有 `test*` 函数，分类汇总服务名、函数数量、运行时和创建时间。

### 调用函数

```
❯ 调用下 test-f 函数
```

Agent 执行 `s cli fc3 invoke --region cn-hangzhou --function-name test-f --silent`，返回 `hello world`。

带自定义事件体：

```bash
s cli fc3 invoke --region cn-hangzhou --function-name test-f --silent \
  -e '{"action":"create","user":"alice","data":{"score":88}}'
```

### 批量调用

```
❯ 给我随机产生自定义事件体，调用 test-f 5 次
```

Agent 生成 5 组各不相同的 JSON 事件体（create/update/delete/search/notify），依次调用并汇总结果表格。

### 查日志

```
❯ 帮我查看下 test-f 最近调用情况
```

Agent 自动构造时间范围（最近 1 小时），执行：

```bash
# macOS
s cli fc3 logs --region cn-hangzhou --function-name test-f \
  -s "$(TZ=Asia/Shanghai date -v-1H +%Y-%m-%dT%H:%M:%S+08:00)" \
  -e "$(TZ=Asia/Shanghai date +%Y-%m-%dT%H:%M:%S+08:00)"

# Linux
s cli fc3 logs --region cn-hangzhou --function-name test-f \
  -s "$(TZ=Asia/Shanghai date -d '1 hour ago' +%Y-%m-%dT%H:%M:%S+08:00)" \
  -e "$(TZ=Asia/Shanghai date +%Y-%m-%dT%H:%M:%S+08:00)"
```

### 按实例查日志

```
❯ 查看下实例 c-69f9eed8-15f8e4fe-55032c26cf38 所有请求情况
```

```bash
s cli fc3 logs --region cn-hangzhou --function-name test-f \
  --instance-id c-69f9eed8-15f8e4fe-55032c26cf38
```

Agent 列出该实例上的全部请求（含冷启动标记和每次调用的 RequestId）。

### 按 RequestId 查日志

```
❯ 查看 1-69f9ef93-1510a7cb-5873a9384742 日志
```

```bash
s cli fc3 logs --region cn-hangzhou --function-name test-f \
  --request-id 1-69f9ef93-1510a7cb-5873a9384742
```

精确返回该次调用的完整日志。

### 查函数详情

```
❯ 查看 test-f 函数详情
```

```bash
s cli fc3 info --region cn-hangzhou --function-name test-f -o json --silent
```

Agent 以表格呈现：运行时、CPU/内存/磁盘、超时、代码大小、网络配置、实例模式、创建/修改时间、日志配置等。

## 更多能力

| 功能 | 说明 |
|------|------|
| `s deploy` | 部署函数（代码/配置/触发器/异步配置可分别部署） |
| `s build` | Docker 环境构建依赖、打层、自定义容器 |
| `s local` | 本地调用/调试（含 VS Code / IntelliJ 断点） |
| `s logs` | SLS 日志查询（按时间/RequestId/实例/失败过滤/tail 跟踪） |
| `s info` / `s plan` | 查看线上配置 / 预览变更 |
| `s remove` | 删除资源（支持 -y 强制、按触发器删除） |
| `s instance` | 查看活跃实例、进入实例 Shell、执行命令 |
| `s version` / `s alias` | 版本发布 + 别名灰度（流量权重） |
| `s scaling` / `s concurrency` | 弹性伸缩 + 并发控制 |
| `s layer` | 层管理（发布/查看/下载/权限/删除） |
| `s session` | 会话管理（创建/列表/更新/删除） |
| `s sync` | 线上配置拉到本地 |
| `s2tos3` | FC2 格式转 FC3 |
| fc3-domain | 自定义域名（多函数路由、HTTPS、TLS、WAF） |

详细用法见 [SKILL.md](./SKILL.md)。