# 问题排查

## 部署阶段

| 现象 / 报错 | 可能原因 | 处理方向 |
|-------------|----------|----------|
| `AccessDenied` / 403 | RAM 权限不足 | 检查 `s config`；部署常用 `AliyunFCFullAccess` |
| `InvalidArgument: code` | `code` 路径空或不存在 | 确认 `code` 指向有效源码目录 |
| `ServiceException: VPC` | VPC / 交换机 / 安全组无效 | 核对 VPC ID；PoC 可先试 `vpcConfig: auto` |
| 镜像拉取超时 | ACR 地址或权限错误 | 检查仓库地址、网络和权限 |
| `DiskSize must be ...` | `cpu` 与 `diskSize` 未成对 | 两者都设或都不设 |
| `instanceConcurrency is not supported` | 非 custom 运行时 | 仅 custom 系列可调 |
| `OutOfMemory` / exit 137 | 内存过小 | 提高 `memorySize` |
| 自定义域名 404 | DNS / CNAME 未生效或路由不匹配 | 先部署函数再部署域名；核对 `routeConfig` |
| HTTPS 证书报错 | PEM 格式或 `certId` / PEM 混用 | 二者择一；`certId` 须同账号 |
| `domainName: auto` 不可用 | 测试域名已回收 | 生产改用自有备案域名 |
| `Function undefined is not defined`（`s cli fc3 deploy -p`） | 纯 CLI 模式下 `-p` 不能可靠地部分更新配置 | 用临时 `s.yaml` + `s deploy --function config -y`，写完整 `props` 再部署 |
| 测试集群连接超时 / `connect ECONNREFUSED` | 内网 / 测试 endpoint 在公网不可达；或未连 VPN | 确认在公司内网 / VPN；`curl -v $FC_CLIENT_CUSTOM_ENDPOINT` |
| 测试集群 `SignatureDoesNotMatch` / 找不到函数 | endpoint 与 `--region` 不匹配，或 UID 填错 | 按集群匹配 `region`；UID 必须是主账号 UID |
| 切回正式环境后仍走测试集群 | `FC_CLIENT_CUSTOM_ENDPOINT` 未清 | `unset FC_CLIENT_CUSTOM_ENDPOINT`，或新开 shell |

## 运行阶段

| 现象 / 报错 | 可能原因 | 处理方向 |
|-------------|----------|----------|
| 超时 | `timeout` 过短或逻辑阻塞 | 增大 `timeout`；查死循环；`s logs --type fail` |
| `Process exited unexpectedly` | 缺依赖或运行时不对 | `s build`；核对 `runtime` |
| `Unable to import module` | 依赖路径未入环境 | 把 build 提示的 env vars 写回 `s.yaml`；核对层 ARN |
| `413 Request Entity Too Large` | HTTP 请求体过大 | 拆包或用 OSS 传引用 |
| `429 Too Many Requests` | 并发打满 | 调整 `reservedConcurrency` 或分流 |

## 构建与本地

| 现象 / 报错 | 可能原因 | 处理方向 |
|-------------|----------|----------|
| `s local` 立刻退出 | Docker 未启动 | 先确认 Docker 可用 |
| `s build` 镜像版本不对 | 缓存旧镜像 | 清理本地构建镜像缓存；或 `export FC_DOCKER_VERSION=3.1.0` |
| 本地未执行构建 | 只有 `pre-deploy` | 补 `pre-local` |
| `local start` 端口占用 | 9001 被占 | 杀旧进程或换端口 |

## 权限与安全

| 现象 / 报错 | 可能原因 | 处理方向 |
|-------------|----------|----------|
| `ram:PassRole` 拒绝 | `logConfig: auto` 等需要传角色 | 配 `ram:PassRole`，并收窄到 `fc.aliyuncs.com` |
| 函数访问不了 VPC 内资源 | 未挂 VPC 或安全组过严 | 检查 `vpcConfig` 与安全组 |
| 不希望注入临时凭据 | 默认注入 STS | 用 `disableInjectCredentials: All` / `Env` / `Request` |
| 层无法使用 | 未授权或 ARN 错误 | 先确认 ACL，或检查层 ARN |
| 仓库里出现密钥 | 误提交 | 立即轮换；本地环境文件加入忽略 |
