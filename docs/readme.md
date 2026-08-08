# FC3 组件文档

FC3 是阿里云函数计算 3.0 的 Serverless Devs 组件，提供创建、开发、调试、部署、运维的全生命周期管理能力。

用户使用请优先阅读 [Serverless Devs 官方文档](https://manual.serverless-devs.com/user-guide/aliyun/#fc3)；本目录面向本仓库的开发与运维。

## 文档目录

- [架构说明](./architecture.md) — 模块划分、目录结构与核心流程
- [贡献指南](./CONTRIB.md) — 开发环境、脚本、测试与提交流程
- [运维手册](./RUNBOOK.md) — 部署、监控、常见故障处理与回滚

## 本地开发

```bash
npm install       # 安装依赖（需私有 Aliyun registry 鉴权，见贡献指南）
npm run build     # 构建产物
npm test          # 运行单元测试（含覆盖率，无需云凭证）
```
