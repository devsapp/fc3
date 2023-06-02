## 组件说明

fc-local-invoke 组件用于本地调试 FC 函数。

## 使用场景

本地调试。

## 具体用法

### http 函数

```
$ s start <[customDomainName/]path>
```
本地启动成功后访问返回的 url 即可访问服务。

### event 函数

```
$ s invoke --mode [api/normal/server]
```

上述指令能够本地调试 event 函数，有三种启动模式:

- api 模式: 启动服务供本地 InvokeFunction API 或者 SDK 进行调用，详情请参见 [invokeFunction](https://help.aliyun.com/document_detail/191156.htm?spm=a2c4g.11186623.2.23.965d559fCBpJrO#doc-api-58601-InvokeFunction) 和 [SDK 列表](https://help.aliyun.com/document_detail/53277.htm?spm=a2c4g.11186623.2.7.393e2a26lkwxgo#concept-2260089)。

- normal 模式: 本地通过容器调用 event 函数返回结果后，立刻关闭容器，此模式为默认模式。

- server 模式: 本地启动一个容器，然后在新开的 terminal 窗口执行 normal 模式的 invoke 指令，则会复用该容器。


