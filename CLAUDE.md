# Claude Code Configuration

This file contains configuration information for Claude Code, an AI programming assistant.

## Project Overview

FC3 is the Serverless Devs component for Alibaba Cloud Function Compute 3.0, providing full lifecycle management for serverless functions. Written in TypeScript with modular architecture supporting create, develop, debug, deploy, and operate workflows.

**Tech Stack**: TypeScript 4.4, Jest, Vercel ncc, f2elint, Prettier

## Available Scripts

| Script                    | Description                                 |
| ------------------------- | ------------------------------------------- |
| `npm run build`           | Production bundle with ncc                  |
| `npm run watch`           | TypeScript watch mode                       |
| `npm test`                | Unit tests with coverage (no credentials)   |
| `npm run test:it`         | Integration tests (needs cloud credentials) |
| `npm run typecheck`       | Type-check without emitting                 |
| `npm run deadcode`        | Audit unused exports (ts-prune)             |
| `npm run depcheck`        | Audit unused dependencies                   |
| `npm run format`          | Prettier formatting                         |
| `npm run lint`            | f2elint scanning                            |
| `npm run fix`             | Auto-fix lint issues                        |
| `npm run publish`         | Build and registry publish                  |
| `npm run generate-schema` | Generate JSON schema                        |

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

**Current Status**: 1138 tests total, 1136 passing, 2 skipped (integration tests require cloud credentials)

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
- `skill` command: install/update the bundled `s-fc3` skill into agent tools (claude/codex/cursor/qoder/agents), global or project scope; local operation, no credentials

## Constraints

### `model` Command — Frozen Logic (DO NOT MODIFY)

**The logic of the `model` command must not be changed in any future iteration.**

Frozen scope (read-only for all subsequent work):

| Path | Contents |
| ---- | -------- |
| `src/subCommands/model/` | `model.ts`, `index.ts`, `fileManager.ts`, `constants.ts`, `utils/` |
| `src/commands-help/model.ts` | `model` command help text |

Rules:

- Do **not** refactor, rename, restructure, or "improve" anything under the frozen scope — not even style-only or lint-driven edits.
- Do **not** change `model` behavior indirectly via shared helpers it depends on. If a shared change is unavoidable, verify `model` behavior is bit-for-bit unchanged and call it out explicitly in the PR.
- Only exception: an explicit, targeted request from the user to change `model`. Absent that, treat the code as frozen.

### Model Download E2E Tests — Disabled in CI

The model download e2e block in `__tests__/e2e/ci-mac-linux.sh` is commented out, so GitHub Actions no longer runs it. It covered `deploy_and_test_model.py` (NAS + OSS storage) and the `s model download` / `s model remove` flow via `__tests__/e2e/model/s_file.yaml`.

- Keep it commented out. Do not re-enable it without an explicit request.
- The `__tests__/e2e/model/` fixtures stay in the repo for manual runs — do not delete them.
- Unit tests under `__tests__/ut/commands/model_test.ts`, `model_utils_test.ts`, `modelService_test.ts`, and `artModelService_test.ts` are fully mocked (no real downloads) and **remain enabled** in `npm test`.

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
