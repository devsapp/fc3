## fc-docker

您能够通过 fc-docker 在本地机器开发测试您的函数，并且该函数的运行结果会与线上结果一致。

## 使用条件

要使用本项目，需要首先安装 [docker](https://www.docker.com/)。

## 示例

您可以在 demos 目录体验:

```shell
# 进入 demos/nodejs14 目录，执行下面命令分别在对应目录中运行函数：

docker run --rm -v $(pwd):/code --env-file ./env.list aliyunfc/runtime-nodejs14:3.0.0  --handler "index.handler" --event '{"key" : "value"}'

# 进入 demos/python3.9 目录，执行下面命令在 python3.9 中运行函数：
docker run --rm -v $(pwd):/code --env-file ./env.list aliyunfc/runtime-python3.9:3.0.0  --handler "index.handler" --event '{"some": "event"}'

# 进入 demos/php7.2 目录，执行下面命令在 php7.2 中运行函数：
docker run --rm -v $(pwd):/code --env-file ./env.list aliyunfc/runtime-php7.2:3.0.0  --handler "index.handler" --event '{"some": "event"}'

# 进入 demos/java8 目录，执行 mvn package 打包函数，然后执行下面命令运行函数:
docker run -v $(pwd)/target/java8-1.0.0.jar:/code/java8-1.0.0.jar --env-file ./env.list aliyunfc/runtime-java8:3.0.0  --handler "examples.Hello::handleRequest"

```

支持更多的长/短参数，列表如下：

| 短参数 |         长参数          |              参数含义 |
| :----- | :---------------------: | --------------------: |
| -h     |        --handler        |              函数入口 |
| 无     |        --timeout        |          函数超时时间 |
| -i     |      --initializer      |        函数初始化入口 |
| -e     | --initializationTimeout |        初始化超时时间 |
| 无     |         --event         |            上传 event |
| 无     |         --stdin         | event 从 stdin 中获取 |
| 无     |        --server         |           server 模式 |

build 镜像的使用方法：

```shell
# 在 build 容器中完成依赖 install
docker run --rm -v $(pwd):/code aliyunfc/runtime-nodejs14:build-3.0.0 bash -c "npm install"

# 在 build 容器进行交互式 bash
docker run --rm -it -v $(pwd):/code aliyunfc/runtime-nodejs14:build-3.0.0 bash

# 在 build 容器中完成 apt install, 在 code 目录下面会生成  apt-archives 目录
docker run --rm -v $(pwd):/code aliyunfc/runtime-nodejs14:build-3.0.0 bash -c "apt-get-install $(cat /code/apt-get.list)"
```

**Build 需要关注的环境变量**

BASE_PATH=/code:/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin

- apt-get.list

```bash
LD_LIBRARY_PATH=/code/apt-archives/usr/local/lib:/code/apt-archives/usr/lib:/code/apt-archives/usr/lib/x86_64-linux-gnu:/code/apt-archives/usr/lib64:/code/apt-archives/lib:/code/apt-archives/lib/x86_64-linux-gnu:/code:/code/lib:/usr/local/lib

PATH=/code/apt-archives/usr/local/bin:/code/apt-archives/usr/local/sbin:/code/apt-archives/usr/bin:/code/apt-archives/usr/sbin:/code/apt-archives/sbin:/code/apt-archives/bin +  ${BASE_PATH}


PYTHONUSERBASE=/code/python
```

- python

```bash
PATH=/code/python/bin +  ${BASE_PATH}
# 所以如果同时存在 apt-get.list 和 requirements.txt， 两个新的 path 都要考虑进来

PYTHONUSERBASE=/code/python
```

- nodejs

```bash
NODE_PATH=/opt/node_modules:/code/node_modules:/usr/local/lib/node_modules
PATH=/code/node_modules/.bin +  ${BASE_PATH}

```

## 环境变量

本项目支持通过环境变量定制容器的一些行为，可用的环境变量包括：

- FC_ACCESS_KEY_ID
- FC_ACCESS_KEY_SECRET
- FC_SECURITY_TOKEN
- FC_FUNCTION_NAME

使用方法为：

```shell
docker run --rm -it -e FC_ACCESS_KEY_ID=xxxxxxx -e FC_ACCESS_KEY_SECRET=xxxxxxxx -v $(pwd):/code nodejs14
```

## build 环境中包含的依赖

- vim
- zip
- git
- build-essential
- clang
- libgmp3-dev
- python2.7-dev
- apt-utils
- dialog
