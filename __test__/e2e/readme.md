# Serverless-Devs-FC-Test

从 [Serverless-Devs-FC-Test](https://github.com/devsapp/Serverless-Devs-FC-Test) 演变而来

直接找一个安装了 ServerlessDevs 和 docker 的 mac/windows/linux 机器, 直接执行:

```
$ ./test.sh
```

测试的是`component: devsapp/fc `, 如果完全没有问题， 至少保证了在各种 Runtime 的 `s build`, `s local invoke`, `s deploy`, `s invoke` 的 happy case 是没有问题的。
