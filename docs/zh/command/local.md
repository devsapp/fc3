---
title: 本地调用 local
description: '本地调用 local'
position: 1
category: '调用&调试'
---

# Local 命令

`local` 命令是在本地对函数调试的命令。

- [Local 命令](#local-命令)
  - [命令解析](#命令解析)
  - [参数解析](#参数解析)
  - [local invoke 命令](#local-invoke-命令)
    - [操作案例](#操作案例)
  - [local start 命令](#local-start-命令)
    - [操作案例](#操作案例-1)
  - [断点调试](#断点调试)
    - [VSCode](#vscode)
    - [Intellij](#intellij)
  - [附录](#附录)
    - [默认断点调试参数](#默认断点调试参数)

> ⚠️ 注意：该命令对 Docker 有所依赖，所以在使用该命令时，需要先进行 [Docker 安装](https://docs.docker.com/get-docker/)。

## 命令解析

当执行命令`local -h`/`local --help`时，可以获取帮助文档。

在该命令中，包括了两个个子命令：

- [invoke：本地调试函数](#local-invoke-命令)
- [start：本地调试 custom/custom.debian10/custom-container 函数](#local-start-命令)

## 参数解析

| 参数全称   | 参数缩写 | Yaml 模式下必填 | 参数含义                                                                                                                                                                                 |
| ---------- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| event      | e        | 选填            | 传入 `event` 函数的 `event` 事件数据，可以通过 `s cli fc-event` 指令快速获取事件数据示例，详细操作参考[这里](https://github.com/devsapp/fc/blob/main/docs/zh/command/invoke.md#注意事项) |
| event-file | f        | 选填            | 以文件形式传入 `event` 事件数据                                                                                                                                                          |
| config     | c        | 选填            | 指定断点调试时使用的 IDE，取值范围：`vscode,intellij`                                                                                                                                    |
| debug-port | d        | 选填            | 指定断点调试端                                                                                                                                                                           |

<!--       | tmp-dir  | -               | 选填 | 自定义函数运行环境中 `/tmp` 路径的本机挂载路径，默认为 `./.s/tmp/invoke/functionName`/ | -->

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`, `--help`等），详情可参考 [Serverless Devs 全局参数文档](https://github.com/Serverless-Devs/Serverless-Devs/blob/master/docs/zh/command/readme.md#%E5%85%A8%E5%B1%80%E5%8F%82%E6%95%B0)

## local invoke 命令

`local invoke` 命令，是进行本地函数调试的命令, 本地函数容器实例执行完毕, 一次执行完毕会自动退出。

### 操作案例

**有资源描述文件（Yaml）时**，可以直接执行`s local invoke`进行本地调试，完成的输出示例：

```
FC Invoke Start RequestId: 0ba8ac3f-abf8-46d4-b61f-8e0f9f265d6a
2021-11-11T05:45:58.027Z 0ba8ac3f-abf8-46d4-b61f-8e0f9f265d6a [INFO] hello world
FC Invoke End RequestId: 0ba8ac3f-abf8-46d4-b61f-8e0f9f265d6a
hello world

RequestId: 0ba8ac3f-abf8-46d4-b61f-8e0f9f265d6a   Billed Duration: 146 ms   Memory Size: 128 MB   Max Memory Used: 23 MB
```

## local start 命令

`local start` 命令，是进行本地函数调试的命令, 本地函数容器实例一直存在的调试模式，除非手动取消这次调试。

### 操作案例

**有资源描述文件（Yaml）时**，可以直接执行`s local start`进行资源部署，部署完成的输出示例：

```text
⌛ Steps for [local] of [hello-world-app]
====================
[2023-09-21 12:17:56][INFO][hello_world] Local baseDir is: /Users/songluo/tmp/aaa/start-fc3-custom-java
You can use curl or Postman to make an HTTP request to 127.0.0.1:9001 to test the function
```

此时，可以根据命令行提示的`url`信息，使用 curl/Postman/浏览器中查看函数本地调试的具体内容。

## 断点调试

断点调试支持的 runtime 有：`python3/python3.9/python3.10、nodejs10/nodejs12/nodejs14/nodejs16, php7.2、java8/java11`

### VSCode

使用 VSCode 进行断点调试时，流程十分简单，支持的语言有 `NodeJS`、`Python` 和 `PHP`。

#### 调试函数

##### step1：打开终端，进入目标项目下(s.yaml 文件所在目录)，输入启动指令

```
s local invoke --config vscode --debug-port 3000
```

启动指令执行后，本地的函数计算执行容器会有一定阻塞，我们需要等待调用；与此同时当前项目会自动生成 `.vscode/launch.json` 文件，该文件是基于 VSCode 进行调试的配置文件，若该文件已经存在，那么启动指令会打印相应配置文本，如下图所示，需要利用这部分内容覆盖已有 `.vscode/launch.json` 中的内容。
![](https://img.alicdn.com/imgextra/i3/O1CN01DcU4ca1VBiSYwrFh4_!!6000000002615-2-tps-1142-387.png)

##### step2：启动断点调试器

打开 VSCode 界面，然后打开 s.yaml 中 codeUri 所存放的源代码，为其打上断点，接着点击开始调试按钮，具体执行如下图所示。
![](https://img.alicdn.com/imgextra/i3/O1CN01yycXnv1vzLO4cB9pv_!!6000000006243-2-tps-750-410.png)

启动调试器后，程序便已经启动，此时就可以开始进行我们的断点调试工作了。

### Intellij

基于 Intellij 进行断点调试时，支持 Java 语言, 接下来我们将以本地调试 Java 函数为例，对"启动断点调试器"步骤进行详细说明。

##### step1：打开终端，进入目标项目下(s.yaml 文件所在的目录)，输入启动指令

由于 Java 是编译型语言，因此在开始前需要对程序进行打包，本文示例会使用 mvn package 对函数打包

```
mvn package
s local invoke --config intellij --debug-port 3000
```

##### step2：启动断点调试器

- 打开 `Intellij` 界面，在菜单栏依次选择 `Run -> Edit Configurations`, 随后如下图所示，新建一个 `Remote JVM Debug`。

  ![](https://img.alicdn.com/imgextra/i3/O1CN01rauocH1lv5Y3crJOB_!!6000000004880-2-tps-1080-389.png)

- 接着，自定义调试器名称，并将端口设置为 3000，如下图所示。

  ![](https://img.alicdn.com/imgextra/i4/O1CN01FRAQlP1cXQXeReL4z_!!6000000003610-2-tps-1080-817.png)

- 最后，打开 s.yml 中 codeUri 存放的源代码，为其打上断点，接着点击开始调试按钮，如图所示。

  ![](https://img.alicdn.com/imgextra/i1/O1CN01uaa9LY1kBSTUS6hdp_!!6000000004645-2-tps-1080-663.png)

## 附录

### 默认断点调试参数

| **Runtime**          | **Default Debug Args**                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `nodejs 10/12/14/16` | `--inspect-brk=0.0.0.0:${debugPort}`                                                      |
| `python 3/3.9/3.10`  | `-m ptvsd --host 0.0.0.0 --port ${debugPort} --wait`                                      |
| `java8`              | `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=${debugPort}`      |
| `java11`             | `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${debugPort}`    |
| `php7.2`             | `remote_enable=1 remote_autostart=1 remote_port=${debugPort} remote_host=${ip.address()}` |
