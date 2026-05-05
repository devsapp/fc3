# Claude Code Configuration

This file contains configuration information for Claude Code, an AI programming assistant.

## Project Overview

FC3 is the Serverless Devs component for Alibaba Cloud Function Compute 3.0, providing full lifecycle management for serverless functions. Written in TypeScript with modular architecture supporting create, develop, debug, deploy, and operate workflows.

**Tech Stack**: TypeScript 4.4, Jest, Vercel ncc, f2elint, Prettier

## Available Scripts

| Script                    | Description                |
| ------------------------- | -------------------------- |
| `npm run build`           | Production bundle with ncc |
| `npm run watch`           | TypeScript watch mode      |
| `npm test`                | Jest tests with coverage   |
| `npm run format`          | Prettier formatting        |
| `npm run lint`            | f2elint scanning           |
| `npm run fix`             | Auto-fix lint issues       |
| `npm run publish`         | Build and registry publish |
| `npm run generate-schema` | Generate JSON schema       |

## Key Directories

| Directory          | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `src/`             | Source code                                  |
| `src/subCommands/` | CLI subcommands (deploy, build, local, etc.) |
| `src/resources/`   | Cloud resources (FC, RAM, SLS, OSS, ACR)     |
| `src/interface/`   | TypeScript interfaces                        |
| `src/utils/`       | Utility functions                            |
| `__tests__/ut/`    | Unit tests                                   |
| `__tests__/it/`    | Integration tests                            |
| `docs/`            | Documentation                                |

## Testing

**Current Status**: 986 tests total, 986 passing, 2 skipped (integration tests require cloud credentials)

**Run tests**: `npm test`
**Coverage**: Run with `--coverage` flag

## Architecture

Modular architecture with:

1. Main entry (`index.ts`) routing to subcommands
2. Base class (`base.ts`) with common preprocessing
3. Subcommand modules for operations
4. Resource modules for cloud service integration

See `docs/architecture.md` for detailed diagrams.

## Recent Features

- HTTP URL support for code/layer sources (v0.1.17)
- Layer publish HTTP bug fix (PR #147)
- FileManager remove operation upgrade support
- ProvisionConfig/ScalingConfig array handling
- LLM metrics in logConfig
- Logs command: multi-topic search (FCLogs + FCInstanceEvents) for --instance-id, SLS field-specific query syntax

## Development Workflow

1. Create branch from `master`
2. Run `npm run lint` and `npm run format`
3. Write/update tests
4. Build: `npm run build`
5. Test: `npm test`
6. Submit PR

## Documentation Index

| File                   | Purpose              |
| ---------------------- | -------------------- |
| `docs/CONTRIB.md`      | Development guide    |
| `docs/RUNBOOK.md`      | Operations runbook   |
| `docs/architecture.md` | Architecture details |
