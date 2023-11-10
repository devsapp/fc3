## 说明

serverless devs s.yaml 在 VSCode 的智能提示和补全

### 智能检测

![](https://img.alicdn.com/imgextra/i4/O1CN019mTUQl1evp0dAZusk_!!6000000003934-2-tps-986-365.png)

![](https://img.alicdn.com/imgextra/i2/O1CN01PDEQQt1HUaI7voNex_!!6000000000761-2-tps-1053-154.png)

![](https://img.alicdn.com/imgextra/i2/O1CN01nMkhiX1tXkQamTHex_!!6000000005912-2-tps-1077-153.png)

### 自动补全

![](https://img.alicdn.com/imgextra/i2/O1CN01p62OTJ1KWMgCEyEvj_!!6000000001171-2-tps-740-346.png)
![](https://img.alicdn.com/imgextra/i1/O1CN01nCiOAY1i40wPxHGGP_!!6000000004358-2-tps-661-139.png)

## 快速使用

- 在 Visual Studio Code 中打开 "Extensions" 侧边栏

- 在搜索框中搜索 "YAML"，找到并安装 "YAML" 插件, 安装如下图两个插件

  ![](https://img.alicdn.com/imgextra/i3/O1CN01MpDohK1dCBvuxAdCV_!!6000000003699-2-tps-742-438.png)

- 打开 Visual Studio Code 的 "首选项" --> "设置"， 输入`yaml.schema`, 如下图, 进行 `settings.json` 文件的编辑

  ![](https://img.alicdn.com/imgextra/i1/O1CN01dEdgcS1tSi4OyYRsY_!!6000000005901-2-tps-1206-413.png)

- 增加如下字段:

  ```
  "yaml.schemas": {
    "https://images.devsapp.cn/json-schema/s-schema.json": [
        "s*.yaml",
        "s*.yml"
    ]
  }
  ```

> Tips: 如果您想离线使用， 可以将 <https://images.devsapp.cn/json-schema/s-schema.json> 下载到本地(假设本地路径是 `/Users/xiliu/json-schema/s-schema.json`)， 然后修改:

```
"yaml.schemas": {
  "file:///Users/xiliu/json-schema/s-schema.json": [
      "s*.yaml",
      "s*.yml"
  ]
}
```

![](https://img.alicdn.com/imgextra/i1/O1CN01IfTx6Y1wltVbAshzH_!!6000000006349-2-tps-1022-427.png)

- 重启 VsCode, 智能提示即可生效
