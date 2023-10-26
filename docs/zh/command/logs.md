---
title: 日志查询 logs
description: '日志查询 logs'
position: 1
category: '可观测性'
---
# Logs 命令

`logs` 命令是查看函数日志的命令。

- [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [操作案例](#操作案例)
- [权限与策略说明](#权限与策略说明)

> ⚠️ 注意：在使用该功能之前，需要先开通 SLS 日志服务，并且函数本身已经配置了相关的日志项目。
## 命令解析

当执行命令`logs -h`/`logs --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | Yaml模式下必填 | Cli模式下必填 | 参数含义                                                     |
| ------------- | -------- | -------------- | ------------- | ------------------------------------------------------------ |
| region        | -        | 选填           | 必填          | 地域名称，取值范围参见[函数计算开服地域](https://www.alibabacloud.com/help/zh/fc/product-overview/region-availability) |
| function-name | -        | 选填           | 必填          | 函数名                                                       |
| request-id     | -    | 选填      | 选填     |  某次请求的Id     |
| start-time    | s        | 选填           | 选填          | 查询的时间点起点，UTC时间或者时间戳，例如`2023-11-02T14:00:00+08:00`，`1698904800000` |
| end-time      | e        | 选填           | 选填          | 查询的时间点终点，UTC时间或者时间戳，例如`2023-11-02T14:04:59+08:00`，`1698905099000` |
| tail          | -        | 选填           | 选填          | 以`tail`模式进行日志输出                                     |
| type          | -        | 选填           | 选填          | 查询的日志类型，成功或者失败,取值范围：`success, fail`         |
| instance-id          | -        | 选填           | 选填          | 根据 instance-id 过滤         |
| qualifier          | -        | 选填           | 选填          | 查询指定版本或者别名         |
| search          | -        | 选填           | 选填          | 查询关键词         |
| match          | -        | 选填           | 选填          | 匹配到的字符高亮         |


> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`等），详情可参考 [Serverless Devs 全局参数文档](https://serverless-devs.com/serverless-devs/command/readme#全局参数)

### 操作案例

- **有资源描述文件（Yaml）时**，可以直接执行`s logs`进行线上函数的日志查询；非tail模式下默认查询最近一小时的日志。
- **纯命令行形式（在没有资源描述 Yaml 文件时）**，需要指定服务所在地区、函数名等，例如`s cli fc3 logs --region cn-hangzhou --function-name functionName`

上述命令的执行结果示例：

```
c-65433b71-a1daa8da5fb1421fb439 2023-11-02 14:02:25 FunctionCompute python3 runtime inited.
c-65432bc7-73eac8cf4dc0431188c9 2023-11-02 14:02:25 FC Invoke Start RequestId: 1-65433b71-09f41218a6212ae916b6fa47
c-65432bc7-73eac8cf4dc0431188c9 2023-11-02 14:02:25 2023-11-02 14:02:25 1-65433b71-09f41218a6212ae916b6fa47 [INFO] xxx
c-65432bc7-73eac8cf4dc0431188c9 2023-11-02 14:02:25 FC Invoke End RequestId: 1-65433b71-09f41218a6212ae916b6fa47
```

如果需要以`tail`模式进行日志的查询，可以增加`--tail`参数，例如`s logs --tail`；

查询指定时间段的日志，可以通过增加`--start-time`和`--end-time`参数实现，例如`s logs -s 2023-11-04T15:40:00 -e 2023-11-04T15:45:00`；

## 权限与策略说明

- 最大权限：`AliyunFCReadOnlyAccess`、`AliyunLogReadOnlyAccess`

- 最小权限：`AliyunFCReadOnlyAccess` 与相关接口权限：

  ```yaml
  {
      "Version": "1",
      "Statement": [
          {
              "Action": "log:GetLogStoreLogs",
              "Effect": "Allow",
              "Resource": "acs:log:<region>:<account-id>:project/<project>/logstore/<logstore>"
          }
      ]
  }
  ```
