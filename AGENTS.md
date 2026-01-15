# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

FC3 is a Serverless Devs component for Alibaba Cloud Function Compute 3.0, providing full lifecycle management for serverless functions. Written in TypeScript, it handles creating, developing, debugging, deploying, and operating functions.

## Common Commands

### Build & Test
```bash
# Build the project (uses ncc to bundle)
npm run build

# Run all tests with coverage
npm test

# Run specific test file
npm test -- path/to/test_file

# Run tests matching pattern
npm test -- -t "test pattern"

# Run without coverage
npm test -- --no-coverage

# Format code
npm run format

# Lint code
npm run lint

# Fix lint issues
npm run fix
```

### Development
```bash
# Watch mode for development
npm run watch

# Generate JSON schema from TypeScript interfaces
npm run generate-schema
```

## Architecture

### Entry Point Flow
1. **Main Entry** (`src/index.ts`): Fc class extends Base, routes to subcommands
2. **Base Class** (`src/base.ts`): Common functionality, `handlePreRun` preprocessing:
   - Handles credential management
   - Role ARN completion and validation
   - Default config application (FUNCTION_DEFAULT_CONFIG vs FUNCTION_CUSTOM_DEFAULT_CONFIG)
   - Trigger role initialization (auto-creates default roles for OSS, SLS, CDN, TableStore, MNS_TOPIC, EventBridge triggers)
   - Base directory resolution from yaml.path

### Module Organization
- **subCommands/**: Each subcommand (deploy, build, local, invoke, etc.) in separate directory with index.ts
- **resources/**: Cloud service management modules
  - `fc/`: Function Compute operations (main FC API client, retry logic, deployment)
  - `ram/`: Role and permission management
  - `sls/`: Log service integration
  - `vpc-nas/`: VPC and NAS configuration
  - `acr/`: Container registry operations
- **utils/**: Shared utility functions
- **interface/**: TypeScript interfaces and type definitions
- **default/**: Default configurations (FUNCTION_DEFAULT_CONFIG, FUNCTION_CUSTOM_DEFAULT_CONFIG, IMAGE_ACCELERATION_REGION)
- **commands-help/**: Help text definitions

### Build System
BuilderFactory pattern with multiple builder types:
- **DefaultBuilder**: Standard code builds
- **ImageDockerBuilder**: Docker-based container builds
- **ImageKanikoBuilder**: Kaniko builds (for App Center)
- **ImageBuildKitBuilder**: BuildKit builds (for YunXiao)

Runtime detection in FC class determines which builder to use.

### Key Architectural Patterns
1. **Subcommand Pattern**: Each public method in Fc class calls `handlePreRun()` then instantiates corresponding subcommand class
2. **Dynamic Method Dispatch**: Some subcommands (version, alias, concurrency, provision, scaling, layer, session, instance, model) use `subCommand` property to route to internal methods
3. **Credential Lazy Loading**: Credentials fetched only when needed via `inputs.getCredential()`
4. **Role ARN Completion**: Role names automatically completed to full ARN format using AccountID

### Testing Structure
- **__tests__/ut/**: Unit tests
- **__tests__/it/**: Integration tests  
- **__tests__/e2e/**: End-to-end tests
- Test naming pattern: `{module}_test.ts`
- Uses Jest with ts-jest transformer
- testTimeout: 30000ms
- Current coverage: ~58% statements, ~54% branches

### Important Implementation Details
- Custom container runtime uses different default configs (FUNCTION_CUSTOM_DEFAULT_CONFIG)
- Image acceleration only available in specific regions (IMAGE_ACCELERATION_REGION)
- NAS mount points default `enableTLS: false` if not specified
- Triggers without explicit invocationRole get auto-created default roles
- Docker check required for local and custom container builds
- FC deployment includes retry logic (FC_DEPLOY_RETRY_COUNT)

## Project-Specific Notes

### Role Handling
The component automatically handles IAM roles:
- Converts role names to full ARN format using AccountID
- Creates default trigger roles when not specified (OSS, SLS, MNS_TOPIC, CDN, TableStore)
- Creates service linked roles for EventBridge triggers

### Runtime Types
- Custom container runtime (`custom-container`): Uses Docker/Kaniko/BuildKit builders
- Custom runtime (`custom`, `custom.debian10`): Uses FUNCTION_CUSTOM_DEFAULT_CONFIG
- Standard runtimes: Uses FUNCTION_DEFAULT_CONFIG

### Default Config Alignment
When memory is 512MB and cpu/diskSize are unset, defaults to cpu=0.35, diskSize=512 (matches console behavior)
