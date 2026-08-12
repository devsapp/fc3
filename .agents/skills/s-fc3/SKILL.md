---
name: s-fc3
description: 阿里云 FC3 + Serverless Devs（`s` + `fc3` 组件 + s.yaml）：部署、调试、日志、版本别名灰度、弹性/并发、触发器、VPC/NAS、自定义域名（fc3-domain）。默认 FC3；`fc` 仅限 FC2 存量。
---

# 阿里云函数计算 FC3（Serverless Devs / `s`）

> 中文为主；命令、YAML 字段名、错误码保留英文便于检索和复制。
> 默认使用 `fc3`。只有用户明确在维护 FC2 存量时，才讨论 `fc` / `edition: 1.0.0`。

## 使用原则

- 先看 `s.yaml`：确认 `region`、`runtime`、`functionName`、`triggers`、`component`。
- 先查用法：每层命令都先 `-h`，例如 `s -h` → `s cli fc3 -h` → `s cli fc3 logs -h`。
- 有 `s.yaml` 时优先用简写命令；没有 `s.yaml` 时用 `s cli fc3 ...` 并把参数写全。
- 非默认接入点、域名、发布运维、触发器、排障等细节，读对应引用文件。
- 遇到 FC2 存量迁移，优先建议 `s2tos3`，不要默认继续沿用 `fc`。

## 核心流程

```text
写代码 → s build → 把构建输出中的 environmentVariables / layers 写回 s.yaml → s deploy → s invoke 或 curl
```

- 改配置前先 `s plan`。
- 只改代码用 `s deploy --function code`。
- 只改配置用 `s deploy --function config`。
- 只改触发器或异步配置时，单独部署对应部分更稳。

## 安装与配置

```bash
npm i -g @serverless-devs/s
s config add
```

### 安装本 Skill 到 Agent 工具

`fc3` 组件自带 `skill` 命令，可把本 skill 安装到主流工具（claude/codex/cursor/qoder/agents）的 `skills/s-fc3/` 目录：

```bash
s cli fc3 skill install                      # 全部工具，用户级（默认）
s cli fc3 skill install --tools claude,codex # 指定工具
s cli fc3 skill install --project            # 装到当前项目
s cli fc3 skill update                       # 覆盖更新
```

`install` 已存在则跳过（`--force` 覆盖）；`update` 始终覆盖。

### 非默认 FC API 接入点

- 使用 `FC_CLIENT_CUSTOM_ENDPOINT`。
- 形式：`{协议}://{主账号uid}.{cluster}.{域}`。
- `{主账号uid}` 必须是主账号 UID，不是子账号 UID。
- `--region` 要和集群匹配。
- 常见测试 / 内网集群模板与示例见 [FC 接入点](references/fc-endpoints.md)。

## 最小示例

```yaml
edition: 3.0.0
name: my-app
access: default

resources:
  my_func:
    component: fc3
    props:
      region: cn-hangzhou
      functionName: my-func
      runtime: python3.10
      handler: index.handler
      memorySize: 128
      cpu: 0.5
      diskSize: 512
      code: ./code
```

## 常用配置项

| 分类 | 配置项 |
|------|--------|
| 身份与运行时 | `region`, `functionName`, `description`, `runtime`, `handler` |
| 算力 | `memorySize`, `cpu`, `diskSize`, `timeout`, `instanceConcurrency` |
| 代码与镜像 | `code`, `customContainerConfig` |
| 网络 | `vpcConfig`, `vpcBinding`, `nasConfig`, `ossMountConfig`, `internetAccess`, `customDNS` |
| 可观测 | `logConfig`, `tracingConfig` |
| 运行时调优 | `customRuntimeConfig`, `environmentVariables`, `instanceLifecycleConfig`, `gpuConfig`, `layers`, `role`, `sessionAffinity`, `sessionAffinityConfig` |
| 发布 | `scalingConfig`（优先）, `concurrencyConfig`, `provisionConfig`（存量） |
| 触发器 | `triggers`, `customDomain` |
| 异步 | `asyncInvokeConfig` |
| 其他 | `tags`, `idleTimeout`, `disableInjectCredentials` |

- `code` 与 `customContainerConfig` 二选一。
- `cpu` 与 `diskSize` 要么同时写，要么都不写。
- `custom` / `custom.debian10` / `custom-container` 下 `handler` 可选，`instanceConcurrency` 可调 1–200。
- 标准运行时的 `instanceConcurrency` 固定为 1。

## 常用命令

### build / deploy / remove / plan

```bash
s build
s build --publish-layer
s build --command="pip install -t . flask"
s build --use-sandbox
s build --dockerfile ./Dockerfile

s deploy
s deploy --function code
s deploy --function config
s deploy --trigger trig1,trig2
s deploy --async-invoke-config
s deploy --skip-push
s deploy -y

s remove
s remove -y
s remove --trigger t1

s plan
```

### local / invoke / logs / instance / info

```bash
s local invoke
s local invoke -e '{"key":"val"}'
s local invoke -f event.json
s local start

s invoke
s invoke -e '{"key":"val"}'
s invoke -f oss.json
s invoke --invocation-type Async
s invoke --qualifier LATEST

s logs
s logs --tail
s logs -s 2026-01-01T10:00:00+08:00 -e 2026-01-01T10:05:00+08:00
s logs --request-id 1-xxx
s logs --type fail
s logs --instance-id c-xxx
s logs --search "ERROR" --match ERROR

s instance list
s instance exec --instance-id c-xxx
s instance exec --instance-id c-xxx --cmd "ls -l"

s info
```

- `s logs` 的时间参数要带时区偏移，不能用 `Z`。
- `s local` 需要 Docker。
- 调试端口和 IDE 配置直接看 `s local invoke --help`。

## 纯 CLI 模式

- 没有 `s.yaml` 时，所有参数写全。
- `--silent` 和 `-o json` / `-o raw` 更适合自动化。
- 全局参数：`-a/--access`、`--debug`、`--silent`、`-o/--output-format`。

```bash
s cli fc3 deploy --region cn-hangzhou --function-name f1 --runtime nodejs20 --handler index.handler --code ./code
s cli fc3 invoke -e "test" --region cn-hangzhou --function-name f1
s cli fc3 info --region cn-hangzhou --function-name f1 -o json --silent
s cli fc3 logs --region cn-hangzhou --function-name f1 --tail
s cli fc3 list --region cn-hangzhou
s cli fc3 sync --region cn-hangzhou --function-name f1
s cli fc3 s2tos3 --source s.yaml --target s3.yaml
```

## 可观测性

- `logConfig` 决定是否能拉函数日志。
- `--request-id` 精确定位一次调用。
- `--tail` 用于持续跟踪。
- `tracingConfig` 用于链路追踪。
- 冷启动通常靠弹性实例缓解。

## 发布与运维

- 顺序：`version` → `alias` → `scaling` → `concurrency`。
- `concurrency` 作用于整函数，不按别名拆分。
- `scaling` 优先于 `provision`。
- `LATEST` 适合测试，不适合长期生产配置。
- `s deploy` 会下发 `scalingConfig`，但后续独立调整更适合 `s scaling`。

详细命令、Layer、Session、Provision 见 [发布与运维](references/release-ops.md)。

## 自定义域名

`fc3-domain`、`customDomain`、证书、路由、TLS、WAF 的完整说明见 [自定义域名](references/domain.md)。

## 触发器与异步

`triggers` 和 `asyncInvokeConfig` 的字段、常见类型、部署顺序见 [触发器与异步](references/triggers-and-async.md)。

## 架构选型

### FC3 vs FC2

- 新项目默认 `fc3`。
- 只有 FC2 存量才保留 `fc`。
- 迁移场景优先考虑 `s2tos3`。

### 运行时选择

```text
需要对外 HTTP，但不想自己起 HTTP 服务？
  ├── 是 → 标准运行时 + HTTP 触发器（Python / Node / Java / Go 等）
  └── 否 → 需要自定义二进制 / 端口 / 框架？
            ├── 固定端口、自定义启动命令 → custom / custom.debian10
            ├── 更强系统 / 镜像控制 → custom-container
            └── GPU 推理 → custom-container + gpuConfig
```

| 运行时 | `handler` | `instanceConcurrency` | 构建 |
|--------|-----------|----------------------|------|
| 标准（python、nodejs 等） | 需要 | 固定 1 | `s build` 自动 |
| custom / custom.debian10 | 可选 | 可调 1–200 | `s build` 自动 |
| custom-container | 可选 | 可调 1–200 | `s build --dockerfile` |

### 何时加网络 / 存储配置

| 需求 | 配置项 | 注意 |
|------|--------|------|
| 访问 VPC 内 RDS/Redis 等 | `vpcConfig` | VPC 不额外按 FC 收 |
| 持久化文件 | `nasConfig` + `vpcConfig` | NAS 存储计费 |
| 只读挂载对象存储 | `ossMountConfig` | OSS 存储与流量 |
| 自定义 DNS | `customDNS` | 视解析服务 |
| 自定义域名 + HTTPS | `fc3-domain` | 域名与证书 |
| GPU | `gpuConfig` | GPU 规格计费 |
| 链路追踪 | `tracingConfig` | 追踪产品计费 |

### 层与代码内联

- 适合用 Layer：依赖大、变更少、多函数共享、需叠加公共层。
- 适合内联：依赖小、每次发版都变、单函数无共享需求。

## 常见实践模式

### 快速改代码上线

```text
改代码 → s build → s deploy --function code → s invoke
```

- 部署按代码包 CRC64 判断变更，未变则跳过上传。

### 大依赖用 Layer

```bash
s build --publish-layer
# 将输出中的 layers、environmentVariables 写入 s.yaml
s deploy
```

### 多环境（vars）

```yaml
vars:
  env: dev

resources:
  my_func:
    props:
      functionName: my-func-${vars.env}
```

```bash
s deploy --var env=staging
```

- 多环境切换也可以用 `s env`，按文档站用户手册 → 内置指令 → Env。

### 自定义容器

```yaml
props:
  runtime: custom-container
  customContainerConfig:
    image: registry.cn-hangzhou.aliyuncs.com/ns/repo:v1
    port: 9000
    command: ['/start.sh']
```

```bash
s build --dockerfile ./Dockerfile
s deploy --skip-push
```

### VPC + NAS

```yaml
props:
  vpcConfig:
    vpcId: vpc-xxx
    securityGroupId: sg-xxx
    vSwitchIds: [vsw-xxx]
  nasConfig:
    userId: 1000
    groupId: 1000
    mountPoints:
      - serverAddr: xxx.nas.aliyuncs.com:/
        mountDir: /mnt/nas
        enableTLS: true
```

### auto 自动创建资源

- `logConfig: auto`、`nasConfig: auto`、`vpcConfig: auto` 由工具自动创建或复用资源，适合 PoC。
- 生产改为显式 ID。

## 凭据与权限

- 用 `s config` 管理 AccessKey，勿写入 `s.yaml` 或代码包。
- 函数执行优先用 `role`（RAM 角色）。
- 非敏感默认值放 `environmentVariables`；敏感值用 `--var`、CI 注入或组织密钥方案。
- `disableInjectCredentials` 支持 `All` / `Env` / `Request`。

| 操作 | 常见策略 |
|------|----------|
| 部署 | `AliyunFCFullAccess` |
| 部署且 `logConfig: auto` | 上述 + `AliyunLogFullAccess` + `ram:PassRole` |
| info / plan / sync | `AliyunFCReadOnlyAccess` |
| invoke | `AliyunFCInvocationAccess` 或 `AliyunFCFullAccess` |
| logs | `AliyunFCReadOnlyAccess` + 日志读权限 |
| 版本 / 别名 / 并发 / 弹性 | 通常需 `AliyunFCFullAccess` |
| 发布层 | `AliyunFCFullAccess` |

> 生产建议：用自定义策略替代 `AliyunFCFullAccess`，资源 ARN 收窄到 `acs:fc:{region}:{uid}:functions/{functionName}`；函数执行角色同样最小权限。

## 问题排查

常见报错、原因和处理见 [问题排查](references/troubleshooting.md)。
