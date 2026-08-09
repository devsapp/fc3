# 自定义域名（fc3-domain）

`fc3-domain` 用于 HTTP 自定义域名、路径路由、HTTPS、TLS、WAF。单函数快配可用 `customDomain`，多函数路由用 `fc3-domain`。

## 目录

- 什么时候读
- props 速查
- 路由字段
- certConfig
- `domainName: auto`
- 常用命令
- 部署顺序
- 权限
- 示例
- 排障

## 什么时候读

- 你要绑自定义域名。
- 你要做多函数路由。
- 你要配 HTTPS / 证书 / TLS / WAF。

## props 速查

| 字段 | 必填 | 说明 |
|------|------|------|
| `region` | 是 | 地域，与函数一致 |
| `domainName` | 是 | 已备案或接入备案的域名 |
| `protocol` | 是 | `HTTP` / `HTTPS` / `HTTP,HTTPS` |
| `routeConfig` | 是 | 路由表，`routes` 为数组 |
| `certConfig` | 否 | HTTPS 证书配置 |
| `tlsConfig` | 否 | TLS 版本范围、加密套件等 |
| `wafConfig` | 否 | `enableWAF: true` 开启 WAF |

## 路由字段

| 字段 | 必填 | 说明 |
|------|------|------|
| `path` | 是 | URL 路径，如 `/*`、`/api/*` |
| `functionName` | 是 | 目标函数名 |
| `qualifier` | 否 | 版本或别名 |
| `methods` | 否 | HTTP 方法列表 |
| `rewriteConfig` | 否 | `equalRules` / `wildcardRules` / `regexRules` |

## certConfig

- 方式一：只填 `certId`，推荐。
- 方式二：填 `certName` + `certificate` + `privateKey`。
- `certId` 与 PEM 三字段不要混用。
- PEM 支持内联、本地文件路径、公网 URL、`oss://{region}/{bucket}/{object}`。

## `domainName: auto`

- 会分配 `*.devsapp.net` 临时测试域名。
- 通常约 1 天后回收。
- 只适合学习和测试，不适合生产。

## 常用命令

```bash
s my_domain deploy
s my_domain plan
s my_domain info
s my_domain remove
```

```bash
s cli fc3-domain list --region cn-hangzhou -a default
s cli fc3-domain info --region cn-hangzhou --domain-name www.example.com -a default
```

## 部署顺序

- 先部署函数和 HTTP 触发器。
- 再部署域名资源。
- 最后把 `domainName` CNAME 到 FC 分配的接入域名。

## 权限

- 部署通常需要 `fc:*CustomDomain*` 相关权限。
- `domainName: auto` 还需要函数 / 触发器权限和 `ram:PassRole`。
- `plan` / `info` 通常只要只读权限。

## 示例

```yaml
edition: 3.0.0
name: my-app
access: default

resources:
  my_func:
    component: fc3
    props:
      region: cn-hangzhou
      functionName: my-http-func
      runtime: custom.debian10
      memorySize: 128
      cpu: 0.5
      diskSize: 512
      code: ./code
      customRuntimeConfig:
        command: ['/code/start.sh']
        port: 9000
      triggers:
        - triggerName: http
          triggerType: http
          qualifier: LATEST
          triggerConfig:
            authType: anonymous
            methods: [GET, POST]
  my_domain:
    component: fc3-domain
    props:
      region: cn-hangzhou
      domainName: my-domain.example.com
      protocol: HTTP
      routeConfig:
        routes:
          - path: /*
            functionName: my-http-func
            qualifier: LATEST
          - path: /api/*
            functionName: my-http-func
            qualifier: v1
```

## 排障

- HTTPS / 双协议时必须配 `certConfig` 或 `certId`。
- 路由不生效时，先核对 `path`、`methods`、函数地域和账号。
- 域名 404 时，先看 DNS 是否 CNAME 到接入域名，再看路由配置。
