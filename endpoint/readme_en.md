# Component description

<center> <a href="./readme.md">中文文档</a> | English </center>

## Set up

Command: `s cli fc-default set`

Subcommand:
- fc-endpoint
-enable-fc-endpoint
- fc-cluster-ip
- api-default-region
- api-default-version

E.g:
- To use a custom endpoint when deploying a function:
```bash
$ s cli fc-default set fc-endpoint xxx
$ s cli fc-default set enable-fc-endpoint true
```
- To use the test cluster ip when deploying the function: `s cli fc-default set fc-cluster-ip xxx`


## Obtain

Command: `s cli fc-default get`

default:

```yaml
fc-endpoint: xxx
enable-fc-endpoint: 'true'
```

## Upper component call

1. Get all configurations
```
const fcDefault = await core.loadComponent('devsapp/fc-default');
const res = await fcDefault.get();
```

2. Get the specified configuration
```
const fcDefault = await core.loadComponent('devsapp/fc-default');
const res = await fcDefault.get({args: "fc-endpoint"});
```

3. Force access to configuration
```
process.env['s-default-fc-endpoint'] = 'xxx'
const fcDefault = await core.loadComponent('fc-default');
const res = await fcDefault.get({args: "fc-endpoint"});
```
