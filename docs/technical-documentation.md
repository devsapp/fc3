# FC3 组件技术文档

## 概述

FC3 是阿里云函数计算 3.0 的 Serverless Devs 组件，提供全生命周期的函数计算管理能力。本文档详细描述了组件的技术实现、API 接口、配置说明和最佳实践。

## 技术栈

### 核心技术

- **TypeScript**: 主要开发语言
- **Node.js**: 运行时环境
- **Jest**: 测试框架
- **Lodash**: 工具库
- **Axios**: HTTP 客户端

### 阿里云服务集成

- **函数计算 FC**: 核心服务
- **对象存储 OSS**: 代码包存储
- **访问控制 RAM**: 权限管理
- **日志服务 SLS**: 日志收集
- **容器镜像服务 ACR**: 镜像管理
- **专有网络 VPC**: 网络配置
- **文件存储 NAS**: 存储配置

## 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│           用户接口层                │
├─────────────────────────────────────┤
│           命令处理层                │
├─────────────────────────────────────┤
│           业务逻辑层                │
├─────────────────────────────────────┤
│           资源管理层                │
├─────────────────────────────────────┤
│           基础设施层                │
└─────────────────────────────────────┘
```

### 核心组件

#### 1. 主入口模块 (Fc)

- **职责**: 统一命令接口，路由到具体子命令
- **关键方法**:
  - `deploy()`: 部署函数和触发器
  - `build()`: 构建函数代码
  - `local()`: 本地运行和调试
  - `invoke()`: 调用函数
  - `info()`: 查询资源信息
  - `logs()`: 查询日志

#### 2. 基础模块 (Base)

- **职责**: 提供公共处理逻辑
- **关键功能**:
  - 配置预处理
  - 角色权限处理
  - 默认配置应用
  - 环境检测

#### 3. 子命令模块 (subCommands)

- **部署模块**: 函数和触发器部署
- **构建模块**: 多环境构建支持
- **本地运行模块**: 多语言本地调试
- **其他模块**: 信息查询、日志、版本管理等

#### 4. 资源管理模块 (resources)

- **FC 模块**: 函数计算资源管理
- **RAM 模块**: 权限和角色管理
- **SLS 模块**: 日志服务集成
- **VPC-NAS 模块**: 网络和存储配置
- **ACR 模块**: 容器镜像管理

## API 接口

### 主接口

#### deploy(inputs: IInputs)

部署函数和触发器

**参数**:

- `inputs`: 输入配置对象

**返回值**: `Promise<any>`

**示例**:

```typescript
const result = await fc.deploy({
  props: {
    region: 'cn-hangzhou',
    functionName: 'my-function',
    runtime: 'nodejs18',
    handler: 'index.handler',
    code: './code',
  },
});
```

#### build(inputs: IInputs)

构建函数代码

**参数**:

- `inputs`: 输入配置对象

**返回值**: `Promise<void>`

**构建类型**:

- `Default`: 默认构建
- `ImageDocker`: Docker 构建
- `ImageKaniko`: Kaniko 构建
- `ImageBuildKit`: BuildKit 构建

#### local(inputs: IInputs)

本地运行函数

**参数**:

- `inputs`: 输入配置对象

**返回值**: `Promise<any>`

**支持语言**:

- Python
- Node.js
- Java
- Go
- PHP
- .NET
- 自定义运行时
- 自定义容器

### 配置接口

#### IProps

组件属性接口

```typescript
interface IProps extends IFunction {
  region: IRegion;
  triggers?: ITrigger[];
  asyncInvokeConfig?: IAsyncInvokeConfig;
  concurrencyConfig?: IConcurrencyConfig;
  provisionConfig?: IProvisionConfig;
  endpoint?: string;
  supplement?: any;
  annotations?: any;
}
```

#### IFunction

函数配置接口

```typescript
interface IFunction {
  functionName: string;
  runtime: string;
  handler: string;
  code: string;
  description?: string;
  memorySize?: number;
  timeout?: number;
  cpu?: number;
  diskSize?: number;
  environmentVariables?: Record<string, string>;
  customContainerConfig?: ICustomContainerConfig;
  customRuntimeConfig?: ICustomRuntimeConfig;
  nasConfig?: INasConfig;
  vpcConfig?: IVpcConfig;
  logConfig?: ILogConfig;
  role?: string;
  layers?: string[];
  tags?: Array<{ key: string; value: string }>;
}
```

#### ITrigger

触发器配置接口

```typescript
interface ITrigger {
  triggerName: string;
  triggerType: TriggerType;
  triggerConfig: any;
  invocationRole?: string;
  qualifier?: string;
}
```

## 配置说明

### 基础配置

#### 函数配置

```yaml
region: cn-hangzhou
functionName: my-function
runtime: nodejs18
handler: index.handler
code: ./code
description: My function description
memorySize: 512
timeout: 60
cpu: 0.35
diskSize: 512
```

#### 环境变量

```yaml
environmentVariables:
  NODE_ENV: production
  API_KEY: your-api-key
```

#### 自定义容器配置

```yaml
customContainerConfig:
  image: registry.cn-hangzhou.aliyuncs.com/my-namespace/my-image:latest
  command: ['node']
  args: ['server.js']
  cpu: 1
  memorySize: 1024
  imagePullPolicy: IfNotPresent
  user: root
  workingDir: /app
  environmentVariables:
    NODE_ENV: production
  webServerMode: true
```

#### VPC 配置

```yaml
vpcConfig:
  vpcId: vpc-1234567890abcdef0
  vSwitchIds: vsw-1234567890abcdef0
  securityGroupId: sg-1234567890abcdef0
```

#### NAS 配置

```yaml
nasConfig:
  mountPoints:
    - serverAddr: 1234567890-abc123.cn-hangzhou.nas.aliyuncs.com
      mountDir: /mnt/nas
      fcDir: /mnt/fc
      enableTLS: false
```

#### 日志配置

```yaml
logConfig:
  project: my-log-project
  logstore: my-log-store
```

### 触发器配置

#### HTTP 触发器

```yaml
triggers:
  - triggerName: http-trigger
    triggerType: http
    triggerConfig:
      authType: anonymous
      methods: ['GET', 'POST']
```

#### OSS 触发器

```yaml
triggers:
  - triggerName: oss-trigger
    triggerType: oss
    triggerConfig:
      bucketName: my-bucket
      events: ['oss:ObjectCreated:*']
      filter:
        Key:
          Prefix: uploads/
          Suffix: .jpg
```

#### 定时触发器

```yaml
triggers:
  - triggerName: timer-trigger
    triggerType: timer
    triggerConfig:
      cronExpression: '0 0 12 * * *'
      enable: true
```

#### 事件总线触发器

```yaml
triggers:
  - triggerName: eb-trigger
    triggerType: eventbridge
    triggerConfig:
      eventSourceConfig:
        eventSourceType: MNS
        eventSourceParameters:
          QueueName: my-queue
          TopicName: my-topic
```

### 高级配置

#### 异步调用配置

```yaml
asyncInvokeConfig:
  destinationConfig:
    onSuccess:
      destination: acs:fc:cn-hangzhou:123456789:functions/success-function
    onFailure:
      destination: acs:fc:cn-hangzhou:123456789:functions/failure-function
  maxAsyncEventAgeInSeconds: 300
  maxAsyncRetryAttempts: 3
```

#### 并发配置

```yaml
concurrencyConfig:
  reservedConcurrency: 10
```

#### 预留配置

```yaml
provisionConfig:
  target: 10
  scheduledActions:
    - schedule: '0 0 12 * * *'
      target: 20
```

## 最佳实践

### 1. 项目结构

```
my-project/
├── s.yaml                 # 配置文件
├── code/                  # 函数代码
│   ├── index.js
│   ├── package.json
│   └── node_modules/
├── .serverless/           # 构建输出
└── README.md
```

### 2. 配置文件管理

```yaml
# s.yaml
edition: 3.0.0
name: my-project
access: default

resources:
  my-function:
    component: fc3
    props:
      region: cn-hangzhou
      functionName: my-function
      runtime: nodejs18
      handler: index.handler
      code: ./code
      memorySize: 512
      timeout: 60
      triggers:
        - triggerName: http-trigger
          triggerType: http
          triggerConfig:
            authType: anonymous
            methods: ['GET', 'POST']
```

### 3. 环境变量管理

```yaml
# 开发环境
environmentVariables:
  NODE_ENV: development
  DEBUG: true

# 生产环境
environmentVariables:
  NODE_ENV: production
  DEBUG: false
```

### 4. 多环境部署

```bash
# 部署到开发环境
s deploy --env dev

# 部署到生产环境
s deploy --env prod
```

### 5. 本地调试

```bash
# 启动本地服务
s local start

# 调用函数
s local invoke --event '{"key": "value"}'
```

### 6. 日志查询

```bash
# 查询函数日志
s logs --tail

# 查询特定时间段的日志
s logs --start-time 2023-01-01T00:00:00Z --end-time 2023-01-01T23:59:59Z
```

## 错误处理

### 常见错误类型

#### 1. 配置错误

- **FunctionNotFound**: 函数不存在
- **InvalidArgument**: 参数无效
- **AccessDenied**: 权限不足

#### 2. 部署错误

- **FunctionAlreadyExists**: 函数已存在
- **TriggerAlreadyExists**: 触发器已存在
- **ResourceQuotaExceeded**: 资源配额超限

#### 3. 运行时错误

- **FunctionTimeout**: 函数超时
- **OutOfMemory**: 内存不足
- **NetworkError**: 网络错误

### 错误处理策略

#### 1. 重试机制

```typescript
// 自动重试配置
const retryConfig = {
  maxRetries: 3,
  retryInterval: 1000,
  backoffMultiplier: 2,
};
```

#### 2. 错误日志

```typescript
// 错误日志记录
logger.error('Deploy failed:', {
  error: error.message,
  stack: error.stack,
  context: deployContext,
});
```

#### 3. 优雅降级

```typescript
// 优雅降级处理
try {
  await deployFunction(config);
} catch (error) {
  if (error.code === 'FunctionAlreadyExists') {
    await updateFunction(config);
  } else {
    throw error;
  }
}
```

## 性能优化

### 1. 构建优化

- 使用 Docker 多阶段构建
- 优化镜像大小
- 使用缓存加速构建

### 2. 部署优化

- 并行部署多个资源
- 增量更新
- 智能重试

### 3. 运行时优化

- 合理设置内存和 CPU
- 使用预留实例
- 优化冷启动时间

## 安全最佳实践

### 1. 权限管理

- 使用最小权限原则
- 定期轮换访问密钥
- 使用 RAM 角色

### 2. 网络安全

- 配置 VPC 网络
- 使用安全组
- 启用 TLS

### 3. 数据安全

- 加密敏感数据
- 使用环境变量
- 定期备份

## 监控和运维

### 1. 日志监控

- 集成 SLS 日志服务
- 设置日志告警
- 日志分析和查询

### 2. 指标监控

- 函数调用次数
- 执行时间
- 错误率
- 冷启动次数

### 3. 告警配置

- 错误率告警
- 延迟告警
- 资源使用告警

## 故障排查

### 1. 部署问题

- 检查配置文件格式
- 验证权限配置
- 查看部署日志

### 2. 运行时问题

- 检查函数日志
- 验证环境变量
- 测试函数逻辑

### 3. 网络问题

- 检查 VPC 配置
- 验证安全组规则
- 测试网络连通性

## 版本管理

### 1. 函数版本

- 使用语义化版本号
- 版本回滚
- 版本比较

### 2. 别名管理

- 创建别名
- 别名切换
- 流量分配

### 3. 灰度发布

- 使用别名进行灰度
- 监控灰度效果
- 快速回滚

## 扩展开发

### 1. 自定义构建器

```typescript
class CustomBuilder extends BaseBuilder {
  async build(): Promise<void> {
    // 自定义构建逻辑
  }
}
```

### 2. 自定义触发器

```typescript
class CustomTrigger {
  async deploy(): Promise<void> {
    // 自定义触发器部署逻辑
  }
}
```

### 3. 插件开发

```typescript
class CustomPlugin {
  async beforeDeploy(): Promise<void> {
    // 部署前处理
  }

  async afterDeploy(): Promise<void> {
    // 部署后处理
  }
}
```

## 贡献指南

### 1. 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/devsapp/fc3.git

# 安装依赖
npm install

# 运行测试
npm test

# 构建项目
npm run build
```

### 2. 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写单元测试
- 添加文档注释

### 3. 提交流程

- Fork 仓库
- 创建功能分支
- 提交代码
- 创建 Pull Request

## 更新日志

### v1.0.0 (2023-01-01)

- 初始版本发布
- 支持基础函数部署
- 支持多种触发器类型
- 支持本地调试

### v1.1.0 (2023-02-01)

- 新增自定义容器支持
- 优化构建性能
- 增强错误处理

### v1.2.0 (2023-03-01)

- 新增异步调用配置
- 支持并发配置
- 优化日志查询

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 联系方式

- 项目主页: https://github.com/devsapp/fc3
- 问题反馈: https://github.com/devsapp/fc3/issues
- 文档网站: https://docs.serverless-devs.com/user-guide/aliyun/fc3/
