# Runbook

## Deployment Procedures

### Production Deployment

#### Prerequisites

- Alibaba Cloud credentials configured
- Serverless Devs CLI (`s`) installed
- Docker available (for container builds)

#### Standard Deployment Flow

```bash
# 1. Verify configuration
s plan

# 2. Build function code
s build

# 3. Deploy to Function Compute
s deploy

# 4. Verify deployment
s info
```

#### Environment-Specific Deployment

```bash
# Deploy to specific region
s deploy --region cn-hangzhou

# Deploy with specific service name
s deploy --service-name my-service

# Deploy only function (skip triggers)
s deploy --function-only
```

### Container Image Deployment

```bash
# Build with Docker
s build --docker

# Build with Kaniko (CI environments)
s build --kaniko

# Build with BuildKit
s build --buildkit
```

### Layer Deployment

```bash
# Publish a layer
s layer publish

# Update function to use layer
s deploy --layers layerArn:version
```

## Monitoring and Alerts

### SLS Log Integration

The FC3 component integrates with Alibaba Cloud SLS (Log Service) for monitoring.

```bash
# Query function logs (tail mode)
s logs --tail

# Query logs for a specific instance
s logs --instance-id <instanceId>

# Query logs with full-text search (SLS quoted syntax)
s logs --query "error AND timeout"

# Query logs for specific time range
s logs --start-time "2026-01-01 00:00:00" --end-time "2026-01-01 23:59:59"
```

> **Note**: The `--query` parameter uses SLS full-text search syntax with quoted strings.
> Avoid field-specific query syntax (e.g., `Key:Value`) as it may not match all log entries.

### Key Metrics to Monitor

| Metric               | Description        | Alert Threshold  |
| -------------------- | ------------------ | ---------------- |
| `FunctionInvocation` | Invocation count   | Spike > 1000/min |
| `FunctionLatency`    | Execution latency  | > 5000ms         |
| `FunctionErrors`     | Error count        | > 10 in 5min     |
| `MemoryUsage`        | Memory utilization | > 90%            |
| `Throttles`          | Throttled requests | > 0              |

### SLS Project Structure

- Project: `{serviceName}-project`
- Logstore: `{serviceName}-logstore`
- Metrics logstore: `{serviceName}-metrics`

## Common Issues and Fixes

### 1. Build Failures

#### Docker Not Available

**Error**: `Docker is not installed or daemon not running`

**Fix**:

```bash
# Check Docker status
docker info

# Start Docker daemon (macOS)
open -a Docker

# Install Docker if missing
# macOS: brew install --cask docker
```

#### Code Size Exceeded

**Error**: `Code size exceeded maximum limit`

**Fix**:

```bash
# Use layer for dependencies
s layer publish --code ./dependencies

# Deploy function with smaller code
s deploy --code ./src --layers <layerArn>
```

### 2. Deployment Failures

#### Role Permission Issues

**Error**: `The role ARN is invalid` or permission denied

**Fix**:

```bash
# Create required role with proper permissions
s deploy --role <roleArn>

# Or use auto role creation
s deploy --auto-role
```

#### VPC Configuration Issues

**Error**: `VPC configuration invalid`

**Fix**:

```yaml
# Verify VPC config in s.yaml
service:
  vpcConfig:
    vpcId: <valid-vpc-id>
    securityGroupId: <valid-sg-id>
```

#### Region Not Supported

**Error**: `Region not supported`

**Fix**: Use supported regions:

- cn-hangzhou, cn-shanghai, cn-beijing
- cn-shenzhen, cn-zhangjiakou, cn-huhehaote
- cn-chengdu, cn-hongkong
- ap-northeast-1 (Tokyo), ap-southeast-1 (Singapore)

### 3. Invocation Failures

#### Timeout Errors

**Error**: `Function execution timeout`

**Fix**:

```yaml
# Increase timeout in configuration
function:
  timeout: 60 # Max 600 seconds
```

#### Memory Insufficient

**Error**: `Out of memory`

**Fix**:

```yaml
# Increase memory configuration
function:
  memorySize: 512 # Can be 128-3072 MB
```

### 4. HTTP URL Code Source

**Issue**: Layer or function code supports HTTP URLs (v0.1.17+)

**Configuration**:

```yaml
# HTTP URL as code source
function:
  code: https://example.com/function-code.zip

layer:
  code: https://example.com/layer-code.zip
```

### 5. SLS Query Syntax Issues

**Issue**: Field-specific SLS query syntax (e.g., `Key:Value`) may not match all log entries

**Fix**: Use quoted full-text search instead:

```bash
# Wrong: field-specific syntax (may miss entries)
s logs --query "Level:Error"

# Correct: full-text search with quoted syntax
s logs --query '"error"'
```

### 6. NAS Configuration Issues

**Error**: `NAS mount point invalid`

**Fix**:

```yaml
# Configure NAS properly
function:
  nasConfig:
    userId: 10003
    groupId: 10003
    mountPoints:
      - serverAddr: <nas-server>
        mountDir: /mnt/dir
```

## Rollback Procedures

### Version-Based Rollback

```bash
# List versions
s version list

# Rollback to previous version
s alias update --alias-name prod --version <previous-version>

# Or create alias pointing to old version
s alias create --alias-name rollback --version <stable-version>
```

### Complete Redeployment

```bash
# 1. Remove current deployment
s remove --all

# 2. Deploy previous configuration
# Restore s.yaml from backup or git
git checkout HEAD~1 s.yaml

# 3. Redeploy
s deploy
```

### Emergency Rollback Steps

1. **Identify issue**: Check logs `s logs --tail`
2. **Stop traffic**: Update alias to old version
3. **Verify rollback**: `s info` and test invocation
4. **Investigate**: Review logs and metrics
5. **Fix forward**: Once identified, deploy fix to new version

## Health Checks

### Post-Deployment Verification

```bash
# Check function status
s info

# Test invocation
s invoke --event '{"test": true}'

# Verify logs flowing
s logs --tail --limit 10
```

### Routine Health Monitoring

```bash
# Daily log review
s logs --start-time yesterday

# Instance health check
s instance list

# Provision status (if using provisioned concurrency)
s provision get
```

## Support Contacts

- GitHub Issues: https://github.com/devsapp/fc3/issues
- Serverless Devs Community: https://github.com/Serverless-Devs/Serverless-Devs
- Alibaba Cloud Support: https://help.aliyun.com
