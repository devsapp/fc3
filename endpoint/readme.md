# 组件说明

<center> 中文文档 | <a href="./readme_en.md">English</a> </center>

## 设置

命令： `s cli fc-default set`

子命令：
- fc-endpoint
- enable-fc-endpoint
- fc-cluster-ip
- api-default-region
- api-default-version

例如：
- 部署函数时，若要使用自定义的 endpoint: 
```bash
$ s cli fc-default set fc-endpoint xxx
$ s cli fc-default set enable-fc-endpoint true
```
- 部署函数时，若要使用测试集群 ip: `s cli fc-default set fc-cluster-ip xxx`


## 获取

命令： `s cli fc-default get`

默认：

```yaml
fc-endpoint: xxx
enable-fc-endpoint: 'true'
```

## 上层组件调用

1. 获取所有配置
```
const fcDefault = await core.loadComponent('devsapp/fc-default');
const res = await fcDefault.get();
```

2. 获取指定配置
```
const fcDefault = await core.loadComponent('devsapp/fc-default');
const res = await fcDefault.get({args: "fc-endpoint"});
```

3. 强制获取配置
```
process.env['s-default-fc-endpoint'] = 'xxx'
const fcDefault = await core.loadComponent('fc-default');
const res = await fcDefault.get({args: "fc-endpoint"});
```
