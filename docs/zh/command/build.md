---
title: 构建 build
description: '构建 build'
position: 2
category: '构建&部署'
---

# Build 命令

`build` 命令是进行函数构建/依赖安装的命令。

- [Build 命令](#build-命令)
  - [命令解析](#命令解析)
    - [参数解析](#参数解析)
    - [操作案例](#操作案例)
      - [基础操作](#基础操作-use-docker)
      - [高阶自定义操作 use-sandbox](#高阶自定义操作-use-sandbox)
  - [apt-get.list 文件](#apt-get.list)

## 命令解析

当执行命令`build -h`/`build --help`时，可以获取帮助文档。

### 参数解析

| 参数全称      | 参数缩写 | 参数含义                                                                                                                  |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| publish-layer | 无       | 将构建后的产物发布成一个 layer                                                                                            |
| use-sandbox   | 无       | 进入对应 runtime 的 sandbox 容器                                                                                          |
| custom-env    | 无       | build 时注入的自定义环境变量                                                                                              |
| custom-args   | 无       | 使用默认 build 行为时的附加参数， 比如指定 pypi 或者 npm 源, 需要配合 use-docker 或 use-buildkit 使用， 默认是 use-docker |
| command       | 无       | 使用自定义命令                                                                                                            |
| script-file   | 无       | 使用自定义脚本                                                                                                            |
| dockerfile    | f        | 指定构建自定义镜像的文件, 构建 custom-container runtime 的镜像时使用                                                      |
| context       | 无       | custom-container 构建镜像时上下文                                                                                         |

> 当前命令还支持部分全局参数（例如`-a/--access`, `--debug`, `--help`等），详情可参考 [Serverless Devs 全局参数文档](https://github.com/Serverless-Devs/Serverless-Devs/blob/master/docs/zh/command/readme.md#%E5%85%A8%E5%B1%80%E5%8F%82%E6%95%B0)

### 操作案例

#### 基础操作

> ⚠️ 注意：该命令对 Docker 有所依赖，所以在使用该命令时，需要先进行 [Docker 安装](https://docs.docker.com/get-docker/)。

由于函数计算的运行环境(Linux debian9)与本地的开发环境可能存在比较大的不同，这就导致一部分本地安装/构建的依赖，代码包等，在线上无法正常运行，所以，Serverless Devs 开发者工具在 `build` 命令中，通过本地的启动 Docker 容器的能力，在容器中进行项目的构建，以尽可能地保证构建出来的依赖/产物，在线上可以得到良好的使用。

不同的运行时，在进行依赖安装/项目构建的时候，可能会有不同的依赖描述文件，其系统默认的对应关系如下：

- Python: `requirements.txt`

- NodeJS: `package.json`

- PHP: `composer.json`

- Custom: `requirements.txt package.json composer.json`

- Custom Container: `dockerfile`

> ⚠️ 注意：在部分语言完成项目构建之后，部署的时候可能会出现交互式操作，提醒用户是否要将安装的依赖路径加入到环境变量中，以便线上可以正确的加载到这些依赖内容。此时可以通过交互式的方法，根据提醒输入`y`，也可以在部署时通过`-y`命令，默认进行环境变量等内容的添加。

> apt-get.list 是非 Custom Container 的 runtime 均可以使用，详情见 [apt-get.list 文件](#apt-get.list), 是一个可选项，绝大部分场景不需要。

以 [Python 应用](https://github.com/devsapp/fc3/tree/master/__tests__/e2e/python)为例：在具有 `requirements.txt` 的 Python 项目下，可以通过`s build`命令实现依赖安装：

1. 开发编辑源代码

2. `s build`之后， 自动根据 `requirements.txt` 和 `apt-get.list` 下载对应的依赖到本地， 并且和源码一起组成交付物，同时会提示完成依赖包的环境变量配置

   ```bash
   ⌛ Steps for [build] of [test-py-app]
   ====================

   build-3.0.0: Pulling from aliyunfc/runtime-python3.10
   Digest: sha256:55b362eb353734ee290d6142b60e62f32fb1da32e8ff5a2e0b888ada403a0efd
   Status: Image is up to date for registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python3.10:build-3.0.0
   registry.cn-beijing.aliyuncs.com/aliyunfc/runtime-python3.10:build-3.0.0


   Ign:1 http://mirrors.aliyun.com/debian-archive/debian stretch InRelease
   Get:2 http://mirrors.aliyun.com/debian-archive/debian stretch-backports InRelease [78.5 kB]
   ...

   Fetched 329 kB in 0s (1487 kB/s)
   Download complete and in download only mode
   Preparing to unpack jq_1.5+dfsg-1.3_amd64.deb
   Preparing to unpack libjq1_1.5+dfsg-1.3_amd64.deb
   Preparing to unpack libonig4_6.1.3-2+deb9u2_amd64.deb
   Looking in indexes: https://mirrors.aliyun.com/pypi/simple/
   Collecting beautifulsoup4
     Downloading https://mirrors.aliyun.com/pypi/packages/57/f4/a69c20ee4f660081a7dedb1ac57f29be9378e04edfcb90c526b923d4bebc/beautifulsoup4-4.12.2-py3-none-any.whl (142 kB)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 143.0/143.0 kB 1.7 MB/s eta 0:00:00
   Collecting flask
     Downloading https://mirrors.aliyun.com/pypi/packages/fd/56/26f0be8adc2b4257df20c1c4260ddd0aa396cf8e75d90ab2f7ff99bc34f9/flask-2.3.3-py3-none-any.whl (96 kB)
       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 96.1/96.1 kB 1.8 MB/s eta 0:00:00
   ...
   Installing collected packages: soupsieve, MarkupSafe, itsdangerous, click, blinker, Werkzeug, Jinja2, beautifulsoup4, flask
   Successfully installed Jinja2-3.1.2 MarkupSafe-2.1.3 Werkzeug-2.3.7 beautifulsoup4-4.12.2 blinker-1.6.2 click-8.1.7 flask-2.3.3 itsdangerous-2.1.2 soupsieve-2.5

   [2023-09-20 17:16:19][INFO][fcDemo] You need to add a new configuration env configuration dependency in yaml to take effect. The configuration is as follows:
   environmentVariables:
     LD_LIBRARY_PATH: /code/apt-archives/usr/local/lib:/code/apt-archives/usr/lib:/code/apt-archives/usr/lib/x86_64-linux-gnu:/code/apt-archives/usr/lib64:/code/apt-archives/lib:/code/apt-archives/lib/x86_64-linux-gnu:/code
     PYTHONPATH: /code/python
     PATH: /code/apt-archives/usr/bin:/code/python/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/code:/code/bin:/opt:/opt/bin

   ✔ [fcDemo] completed (27.54s)
   ```

3. 按照提示在 s.yaml 中完成依赖包的环境变量配置 [s.yaml#L19-L22](https://github.com/devsapp/fc3/tree/master/__tests__/e2e/python/s.yaml#L19-L22)， 然后执行 `s deploy` 将整个交付物 zip 打包， 创建函数

4. 如果您觉的函数代码包过大， 影响您的部署效率， 您可以将您的构建的第三方包直接发布成一个层， 然后在 s.yaml 中引入这个层即可

   只需执行 `s build --publish-layer`, 您可以在输出日志看到如下提示:

   ```
   environmentVariables:
     LD_LIBRARY_PATH: /opt/apt-archives/usr/local/lib:/opt/apt-archives/usr/lib:/opt/apt-archives/usr/lib/x86_64-linux-gnu:/opt/apt-archives/usr/lib64:/opt/apt-archives/lib:/opt/apt-archives/lib/x86_64-linux-gnu:/opt
     PYTHONPATH: /opt/python
     PATH: /opt/apt-archives/usr/bin:/opt/python/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/code:/code/bin:/opt:/opt/bin
   layers:
     - acs:fc:cn-huhehaote:1431999136518149:layers/fc3-event-python310-layer/versions/1
   ```

   同时在您 yaml 指定的 code 目录下面增加了 .fcignore 文件，这样您的函数代码包就可以大大减小，提高部署效率，毕竟第三方依赖的构建变动是不频繁的。

> **Tips:**
>
> 1. 在 build 过程中注入自定义环境变量和使用指定的 pypi 源， 可以使用如下命令 `s build --custom-env '{"myenv": "test"}' --custom-args='-i https://pypi.tuna.tsinghua.edu.cn/simple'`
> 2. 如果不想使用 `s build` 的默认行为
>    - 2.1 直接输入命令 `s build --command="pip install -t . flask -i https://pypi.tuna.tsinghua.edu.cn/simple"` , command 工作的目录对应您 s.yaml 指定的 codeUri
>    - 2.2 直接输入命令 `s build --script-file my_script.sh` , my_script.sh 工作的目录对应您 s.yaml 指定的 codeUri

**Node.js 项目**、**PHP 项目**与 Python 项目类似，都是在开发代码之后，可以通过`s build`进行依赖安装，此时工具将会自动根据相关依赖文件（例如 Node.js 是 `package.json` ，PHP 是`composer.json` ）下载对应的依赖到本地， 并且和源码一起组成交付物,同时会提示完成依赖包的环境变量配置; 按照提示完成配置，接下来可以通过`s deploy`进行项目部署，此时工具会将整个交付物 ZIP 打包， 创建函数，让函数可以直接 `require` 对应的代码依赖包。

**Custom Container**，则是需要先[开通 ACR/CR 容器镜像服务](https://cr.console.aliyun.com/)，然后在`s.yaml`的`image`字段处填写好`acr`镜像地址，通过`s build --dockerfile ./Dockerfile`进行项目构建；接下来可以通过`s deploy -y`将项目部署到线上，此时工具会自动先将构建完成的镜像推送到 ACR 服务，然后再进行函数的创建, 示例可参考 [custom-container example](https://github.com/devsapp/fc3/tree/master/__tests__/e2e/custom-container/run#L7,8)

> 💡 在使用`build`命令时，可以通过环境变量 `FC_DOCKER_VERSION` 控制镜像的版本，例如 export FC_DOCKER_VERSION=3.0.0（所有可用版本可查看 <https://hub.docker.com/u/aliyunfc> ）

> 💡 在代码包的场景中， 除了各自语言的库以外， 其实还有更加复杂的情况，例如，在函数计算的 Python Runtime 想使用 jq 这个工具， 此时还需要 [apt-get.list](https://github.com/devsapp/fc3/tree/master/__tests__/e2e/python/code/apt-get.list) 的支持。

#### 高阶自定义操作 use-sandbox

为了满足用户自定义操作， Serverless Devs 开发者工具在 `build` 命令中，增加了 `--use-sandbox` 的命令， 只要输入:

```bash
$ s build --use-sandbox
# or
$ s build --use-sandbox --custom-env '{"myenv": "test"}'
```

Serverless Devs 开发者工具会根据您 `s.yaml` 中的 runtime, 自动拉起一个模拟线上 runtime 的真实容器， 并且将您 s.yaml 中的 `codeUri` 指定的目录挂载到容器的 `/code` 目录下面，之后您可以在容器里面执行 `npm install` 等满足您自己需求的命令。

在这里推荐使用内置 apt-get-install 工具解决您可能遇见的高阶难题，比如:

**第三方 lib 依赖底层的 so 文件**
比如在 nodejs14 runtime 部署 puppeteer 应用，但是 puppeteer 依赖的一些底层 so 库在 nodejs14 runtime 中不存在， 可以借助 apt-get-install 完成我们的目标:

```bash
root@6e9f82d4644a:/code# apt-get-install  libblas3 fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libnspr4 libnss3 libpangocairo-1.0-0 libxcb-dri3-0 libx11-xcb1 libxcb1 libxss1 libxtst6 lsb-release xdg-utils libatspi2.0-0 libatk1.0-0 libxkbcommon0 libepoxy0 libglapi-mesa libnspr4 libgbm-dev
Ign:1 http://mirrors.aliyun.com/debian-archive/debian stretch InRelease
Hit:2 http://mirrors.aliyun.com/debian-archive/debian stretch-backports InRelease
Hit:3 http://mirrors.aliyun.com/debian-archive/debian-security stretch/updates InRelease
Hit:4 http://mirrors.aliyun.com/debian-archive/debian stretch Release
Reading package lists... Done
...
The following additional packages will be installed:
  adwaita-icon-theme dconf-gsettings-backend dconf-service distro-info-data glib-networking glib-networking-common
  glib-networking-services gsettings-desktop-schemas libasound2-data libblas-common libcolord2 libdbusmenu-glib4
  libdbusmenu-gtk3-4 libdconf1 libegl1-mesa libgbm1 libgfortran3 libgtk-3-common libindicator3-7 libjson-glib-1.0-0
  libjson-glib-1.0-common libproxy1v5 librest-0.7-0 libsoup-gnome2.4-1 libsoup2.4-1 libwayland-client0 libwayland-cursor0
  libwayland-egl1-mesa libwayland-server0 libxcb-dri2-0 libxcb-present0 libxcb-sync1 libxcb-xfixes0 libxshmfence1 xkb-data
Suggested packages:
  libasound2-plugins alsa-utils colord gvfs lsb gvfs-bin
...
Need to get 25.4 MB of archives.
After this operation, 91.7 MB of additional disk space will be used.
Get:1 http://mirrors.aliyun.com/debian-archive/debian stretch/main amd64 libxss1 amd64 1:1.2.2-1 [17.5 kB]
Get:2 http://mirrors.aliyun.com/debian-archive/debian stretch/main amd64 adwaita-icon-theme all 3.22.0-1+deb9u1 [11.5 MB]
...
Fetched 25.4 MB in 10s (2528 kB/s)
Download complete and in download only mode
Preparing to unpack adwaita-icon-theme_3.22.0-1+deb9u1_all.deb
...
Preparing to unpack xkb-data_2.19-1+deb9u1_all.deb
root@6e9f82d4644a:/code# ls
apt-archives  index.js
root@6e9f82d4644a:/code# ls apt-archives/
etc  usr
```

如上所示，so 底层 lib 全部安装到 apt-archives 目录下面， 为了使函数能正确使用到这些 so 文件， 最后 deploy 的时候给函数增加下面两个环境变量即可：

```bash
LD_LIBRARY_PATH=/code/apt-archives/usr/local/lib:/code/apt-archives/usr/lib:/code/apt-archives/usr/lib/x86_64-linux-gnu:/code/apt-archives/usr/lib64:/code/apt-archives/lib:/code/apt-archives/lib/x86_64-linux-gnu:/code

PATH=/code/apt-archives/usr/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/code:/code/bin:/opt:/opt/bin
```

## apt-get.list

此文件顾名思义，就是声明可以使用 apt-get 命令安装但是函数计算没有系统包。

使用方式是在 code 目录的根目录下，创建一个 apt-get.list 的文件，文件内容如下所示。然后部署之前执行 `s build` 即可。

```
zip
unzip
```
