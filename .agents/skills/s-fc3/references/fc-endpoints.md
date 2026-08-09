# FC 接入点

- 只在非默认 FC OpenAPI 时使用 `FC_CLIENT_CUSTOM_ENDPOINT`。
- 格式：`{协议}://{主账号uid}.{cluster}.{域}`。
- `{主账号uid}` 必须替换成当前账号的主账号 UID；子账号也要用其所属主账号 UID。
- `--region` 必须和集群对应，否则容易出现路由错误、签名错误或找不到函数。
- 测试集群通常用 HTTP；生产或正式环境使用 HTTPS。
- `s.yaml` 里的 `props.endpoint` 只对当前资源生效；如果同时设置，它优先于环境变量。
- `export` 只影响当前 shell；切回正式环境用 `unset FC_CLIENT_CUSTOM_ENDPOINT`。
- 内网 / 测试域名通常只在公司内网或 VPN 可达。

## 常见集群

| 集群 | endpoint 模板 | 配套 region |
|------|--------------|-------------|
| 上海 spe | `http://{主账号uid}.cn-shanghai-cloudspe.fc.aliyuncs.com` | `cn-shanghai` |
| 上海 mulzone | `http://{主账号uid}.mulzones-cluster.test.fc.aliyun-inc.com` | `cn-shanghai` |
| 新加坡测试 | `http://{主账号uid}.ap-southeast-1-front.fc-test.aliyuncs.com` | `ap-southeast-1` |
| 北京 pre | `http://{主账号uid}.{cluster}.cn-beijing.fc-pre.aliyuncs.com` | `cn-beijing` |
| 内网（示例） | `https://{主账号uid}.cn-heyuan-acdr-1-internal.fc.aliyuncs.com` | 与集群一致 |

> 北京 pre 的 `{cluster}` 是具体灰度集群名，按发布团队给出的值替换，不是固定字符串。

## 示例

```bash
# 上海 spe
export FC_CLIENT_CUSTOM_ENDPOINT="http://123456789.cn-shanghai-cloudspe.fc.aliyuncs.com"
s cli fc3 list --region cn-shanghai -a default

# 上海 mulzone
export FC_CLIENT_CUSTOM_ENDPOINT="http://123456789.mulzones-cluster.test.fc.aliyun-inc.com"
s cli fc3 info --region cn-shanghai --function-name my-func -a default

# 新加坡测试
export FC_CLIENT_CUSTOM_ENDPOINT="http://123456789.ap-southeast-1-front.fc-test.aliyuncs.com"
s cli fc3 invoke --region ap-southeast-1 --function-name my-func -a default

# 北京 pre
export FC_CLIENT_CUSTOM_ENDPOINT="http://123456789.{cluster}.cn-beijing.fc-pre.aliyuncs.com"
s cli fc3 list --region cn-beijing -a default
```

## 排障

- 连接超时或 `connect ECONNREFUSED`：通常是内网 endpoint 在公网不可达，或没有连 VPN。
- `SignatureDoesNotMatch`：通常是 `--region` 与集群不匹配，或 endpoint 里的 UID 填成了子账号 ID。
- 访问失败后先确认 `curl -v $FC_CLIENT_CUSTOM_ENDPOINT` 是否能连通，再看签名和区域。

## 主账号 UID

- 阿里云控制台右上角头像 → 安全设置 / 账号管理。
- 或用 `aliyun sts GetCallerIdentity` 查看 `AccountId`。
