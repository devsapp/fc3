# FC3 组件测试计划

## 现有测试覆盖情况分析

### 已测试模块

1. **utils 模块** - 部分覆盖

   - `utils_test.ts` - 工具函数测试
   - `utils_functions_test.ts` - 工具函数测试
   - `verify_test.ts` - 验证函数测试
   - `verify_simple_test.ts` - 简单验证测试

2. **resources 模块** - 部分覆盖

   - `resources_acr_test.ts` - ACR 资源测试
   - `fc_client_test.ts` - FC 客户端测试

3. **subCommands 模块** - 部分覆盖

   - `subCommands_test.ts` - 子命令测试（主要测试 2to3 和 alias）

4. **interface 模块** - 部分覆盖

   - `interface_test.ts` - 接口测试

5. **其他工具模块**
   - `transformCustomDomainProps_test.ts` - 自定义域名转换测试
   - `downloadFile_test.ts` - 文件下载测试
   - `crc64_test.ts` - CRC64 测试

## 需要补充测试的模块

### 1. 核心模块测试

#### 1.1 主入口模块 (src/index.ts)

**优先级**: 高
**测试内容**:

- `deploy()` 方法测试
- `build()` 方法测试
- `local()` 方法测试
- `invoke()` 方法测试
- `info()` 方法测试
- `logs()` 方法测试
- `plan()` 方法测试
- `remove()` 方法测试
- `sync()` 方法测试
- `alias()` 方法测试
- `concurrency()` 方法测试
- `provision()` 方法测试
- `layer()` 方法测试
- `instance()` 方法测试
- `version()` 方法测试
- `model()` 方法测试
- `s2tos3()` 方法测试
- `getSchema()` 方法测试
- `getShownProps()` 方法测试

#### 1.2 基础模块 (src/base.ts)

**优先级**: 高
**测试内容**:

- `handlePreRun()` 方法测试
- `_handleRole()` 私有方法测试
- `_handleDefaultTriggerRole()` 私有方法测试
- 构造函数测试
- 日志设置测试

### 2. 子命令模块测试

#### 2.1 部署模块 (src/subCommands/deploy/)

**优先级**: 高
**测试内容**:

- `Deploy` 类测试
- `deploy/impl/function.ts` 测试
- `deploy/impl/trigger.ts` 测试
- `deploy/impl/vpc_binding.ts` 测试
- `deploy/impl/custom_domain.ts` 测试
- `deploy/impl/concurrency_config.ts` 测试
- `deploy/impl/async_invoke_config.ts` 测试
- `deploy/impl/provision_config.ts` 测试
- `deploy/impl/base.ts` 测试

#### 2.2 构建模块 (src/subCommands/build/)

**优先级**: 高
**测试内容**:

- `BuilderFactory` 工厂类测试
- `DefaultBuilder` 测试
- `ImageDockerBuilder` 测试
- `ImageKanikoBuilder` 测试
- `ImageBuildKitBuilder` 测试
- `BaseImageBuilder` 测试
- `BaseBuilder` 测试

#### 2.3 本地运行模块 (src/subCommands/local/)

**优先级**: 中
**测试内容**:

- `Local` 主类测试
- `local/impl/baseLocal.ts` 测试
- `local/impl/utils.ts` 测试
- `local/impl/start/` 目录下所有启动器测试
- `local/impl/invoke/` 目录下所有调用器测试

#### 2.4 其他子命令模块

**优先级**: 中
**测试内容**:

- `info/index.ts` 测试
- `plan/index.ts` 测试
- `invoke/index.ts` 测试
- `logs/index.ts` 测试
- `remove/index.ts` 测试
- `sync/index.ts` 测试
- `alias/index.ts` 测试
- `concurrency/index.ts` 测试
- `provision/index.ts` 测试
- `layer/index.ts` 测试
- `instance/index.ts` 测试
- `version/index.ts` 测试
- `model/index.ts` 测试
- `trigger-template/index.ts` 测试

### 3. 资源管理模块测试

#### 3.1 FC 函数计算模块 (src/resources/fc/)

**优先级**: 高
**测试内容**:

- `fc/index.ts` 测试
- `fc/impl/client.ts` 测试
- `fc/impl/utils.ts` 测试
- `fc/impl/replace-function-config.ts` 测试
- `fc/error-code.ts` 测试

#### 3.2 RAM 权限管理模块 (src/resources/ram/)

**优先级**: 中
**测试内容**:

- `ram/index.ts` 测试
- `RamClient` 类测试
- 角色管理功能测试

#### 3.3 SLS 日志服务模块 (src/resources/sls/)

**优先级**: 中
**测试内容**:

- `sls/index.ts` 测试
- 项目名称生成测试
- 日志存储名称生成测试

#### 3.4 VPC-NAS 网络存储模块 (src/resources/vpc-nas/)

**优先级**: 中
**测试内容**:

- `vpc-nas/index.ts` 测试
- VPC NAS 规则获取测试

#### 3.5 ACR 容器镜像模块 (src/resources/acr/)

**优先级**: 中
**测试内容**:

- `acr/index.ts` 测试
- `acr/login.ts` 测试
- 登录功能测试
- 镜像元数据获取测试

### 4. 工具模块测试

#### 4.1 工具函数模块 (src/utils/)

**优先级**: 中
**测试内容**:

- `utils/index.ts` 中未测试的函数
- `utils/verify.ts` 测试
- `utils/run-command.ts` 测试

#### 4.2 日志模块 (src/logger.ts)

**优先级**: 低
**测试内容**:

- 日志功能测试
- 日志级别测试

#### 4.3 常量模块 (src/constant.ts)

**优先级**: 低
**测试内容**:

- 常量定义测试

### 5. 接口定义模块测试

#### 5.1 接口模块 (src/interface/)

**优先级**: 低
**测试内容**:

- 接口定义验证
- 接口类型检查

### 6. 默认配置模块测试

#### 6.1 默认配置模块 (src/default/)

**优先级**: 低
**测试内容**:

- `default/config.ts` 测试
- `default/resources.ts` 测试
- `default/image.ts` 测试

### 7. 命令帮助模块测试

#### 7.1 命令帮助模块 (src/commands-help/)

**优先级**: 低
**测试内容**:

- 帮助信息生成测试
- 命令描述测试

## 测试策略

### 1. 测试优先级

- **高优先级**: 核心功能模块（主入口、基础模块、部署模块、构建模块、FC 资源模块）
- **中优先级**: 子命令模块、资源管理模块、工具模块
- **低优先级**: 辅助模块（日志、常量、接口、默认配置、命令帮助）

### 2. 测试类型

- **单元测试**: 测试单个函数或方法
- **集成测试**: 测试模块间的交互
- **Mock 测试**: 使用 Mock 对象测试外部依赖

### 3. 测试覆盖率目标

- **核心模块**: 90% 以上
- **子命令模块**: 80% 以上
- **资源管理模块**: 80% 以上
- **工具模块**: 85% 以上
- **整体覆盖率**: 80% 以上

### 4. 测试数据

- 使用真实的测试数据
- 使用 Mock 数据模拟外部服务
- 使用边界值测试

### 5. 测试环境

- 本地开发环境
- CI/CD 环境
- 不同操作系统环境

## 测试实施计划

### 第一阶段：核心模块测试（1-2 周）

1. 主入口模块测试
2. 基础模块测试
3. 部署模块测试
4. 构建模块测试
5. FC 资源模块测试

### 第二阶段：子命令模块测试（1-2 周）

1. 本地运行模块测试
2. 其他子命令模块测试
3. 资源管理模块测试

### 第三阶段：辅助模块测试（1 周）

1. 工具模块测试
2. 日志模块测试
3. 常量模块测试
4. 接口定义模块测试
5. 默认配置模块测试
6. 命令帮助模块测试

### 第四阶段：集成测试和优化（1 周）

1. 集成测试
2. 性能测试
3. 测试覆盖率优化
4. 测试文档完善

## 测试工具和框架

### 1. 测试框架

- **Jest**: 主要的测试框架
- **ts-jest**: TypeScript 支持

### 2. Mock 工具

- **jest.mock()**: 模块 Mock
- **jest.fn()**: 函数 Mock
- **jest.spyOn()**: 方法监听

### 3. 断言库

- **Jest 内置断言**: 基础断言
- **自定义断言**: 特定业务断言

### 4. 测试工具

- **supertest**: HTTP 测试
- **nock**: HTTP Mock
- **sinon**: 高级 Mock 功能

## 测试质量保证

### 1. 代码审查

- 测试代码审查
- 测试用例审查
- 测试覆盖率审查

### 2. 持续集成

- 自动化测试执行
- 测试结果报告
- 测试失败通知

### 3. 测试维护

- 定期更新测试用例
- 修复失效的测试
- 优化测试性能

## 测试文档

### 1. 测试用例文档

- 测试用例描述
- 测试数据说明
- 预期结果说明

### 2. 测试报告

- 测试执行结果
- 测试覆盖率报告
- 测试性能报告

### 3. 测试指南

- 测试环境搭建
- 测试执行方法
- 测试问题排查
