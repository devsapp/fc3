
## src 目录结构

```
|-- commands-help/    配置 help 信息
|-- default/          用于处理一些默认值
|-- interface/        暴露一些全局的声明
|-- resources/        对资源的公共处理
|-- subCommands/      处理子命令的业务逻辑
|-- utils/            公有方法
|-- base.ts           命令公有处理方法和对外暴露的能力
|-- constant.ts       一些常量，建议带有`__dirname`的寻址变量在此文件声明
|-- index.ts          核心入口文件
|-- logger.ts         处理日志的文件
```
