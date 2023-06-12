# 组件说明

## invoke 指令

## 非断点调试

支持的 runtime 有:

- nodejs6/8/10/12/14

- python2.7/3/3.9/3.10

- php7.2

- java8/11

- dotnetcore2.1

- custom runtime

## 断点调试

- nodejs6/8/10/12/14 IDE: Vscode

- python2.7/3/3.9/3.10 IDE: Vscode

- php7.2 IDE: Vscode

- java8/11 IDE: Intellij IDEA

其中对于 custom container, 当执行 s invoke -e "test", 会本地唤起一个 http server, 终端会输出用户应该使用的完整的 curl 命令

## start 指令

目前仅针对 custom runtime 和 custom-container runtime, 会本地唤起一个 http server, 然后按照您自己的需求使用 curl 或者 postman 对本地的 http server 发起请求即可

# TODO

针对 custom container 唤起的本地 http server 容器， 在终端 ctrl+c 不能直接退出并销毁容器， 需要执行 docker kill 显式处理
