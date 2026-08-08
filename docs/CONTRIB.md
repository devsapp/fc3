# Contributing Guide

## Reporting Issues

- **Security issues**: do not open a public issue. Email [service@serverlessfans.com](mailto:service@serverlessfans.com) privately.
- **Bugs and feature requests**: open an issue at [fc3 issues](https://github.com/devsapp/fc3/issues). Search existing issues first, and remove any secrets (keys, tokens, private data) from your report.

## Development Setup

### Prerequisites

- Node.js 16+ (Node 20 recommended)
- npm or yarn
- Docker (for container build operations)
- Alibaba Cloud account with Function Compute access
- Access credentials for the private Aliyun npm registry (see [Private Registry Authentication](#private-registry-authentication) below)

### Private Registry Authentication

Some dependencies are **not published to the public npm registry** and can only be
resolved from a private Aliyun package registry. Notably:

- `@serverless-devs/docker-image-builder` (direct dependency) — returns 404 on both
  `registry.npmjs.org` and `registry.npmmirror.com`.
- `@alicloud/sls20191023` (transitive, via `@serverless-cd/srm-aliyun-sls20201230`).

Their `resolved` URLs are pinned in `package-lock.json` to
`https://packages.aliyun.com/670e108663cd360abfe4be65/npm/npm-registry/`, which
requires **HTTP Basic auth** (a direct fetch returns `401`). Without valid
credentials, `npm install` will fail for these packages.

Add the auth token to your **global** `~/.npmrc` (never commit it):

```ini
//packages.aliyun.com/670e108663cd360abfe4be65/npm/npm-registry/:_authToken=<YOUR_TOKEN>
```

> **CI note:** CI pipelines and new contributors must configure this token (e.g. via
> a masked secret) before `npm install`, or dependency resolution will break. This is
> a pre-existing project constraint, independent of the `overrides`/`resolutions`
> fields in `package.json`.

### Installation

```bash
# Clone the repository
git clone https://github.com/devsapp/fc3.git
cd fc3

# Install dependencies
npm install

# Build the project
npm run build
```

## Available Scripts

| Script            | Command                                                             | Description                                     |
| ----------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| `build`           | `ncc build src/index.ts -m -o dist`                                 | Build production bundle using Vercel ncc        |
| `watch`           | `npx tsc -w -p tsconfig.json`                                       | Watch mode for development                      |
| `start`           | `npm run watch`                                                     | Alias for watch mode                            |
| `test`            | `jest --config jestconfig.json __tests__/ut --coverage`             | Run unit tests with coverage (no credentials)   |
| `test:it`         | `jest --config jestconfig.json __tests__/it`                        | Run integration tests (needs cloud credentials) |
| `deadcode`        | `ts-prune -p tsconfig.json`                                         | Audit unused exports                            |
| `depcheck`        | `depcheck`                                                          | Audit unused dependencies                       |
| `format`          | `prettier --write src`                                              | Format source code with Prettier                |
| `lint`            | `f2elint scan`                                                      | Run linter checks                               |
| `fix`             | `f2elint fix`                                                       | Auto-fix linting issues                         |
| `publish`         | `npm i && npm run build && s registry publish`                      | Build and publish to registry                   |
| `generate-schema` | `typescript-json-schema ./src/interface/index.ts IProps --required` | Generate JSON schema from TypeScript interfaces |
| `typecheck`       | `tsc --noEmit -p tsconfig.json`                                     | Type-check without emitting (CI gate)           |
| `prebuild`        | node one-liner: rm + mkdir `dist`, copy `src/schema.json`           | Prepare dist directory before build (portable)  |
| `prewatch`        | node one-liner: mkdir `dist`, copy `src/schema.json`                | Ensure dist and schema.json exist before watch  |

## Development Workflow

### 1. Branch Strategy

- `master` - Main branch for releases
- Feature branches: `feature/<name>`
- Fix branches: `fix/<name>`

### 2. Code Style

- TypeScript with strict typing
- Follow Prettier formatting rules
- Use f2elint for linting compliance
- Max line length: 120 characters

### 3. Commit Convention

```
<type>: <description>

Types: feat, fix, refactor, docs, test, chore, perf, ci
```

### 4. Testing

#### Test Structure

```
__tests__/
├── ut/           # Unit tests
│   ├── base_test.ts
│   ├── deploy_test.ts
│   └── ...
└── it/           # Integration tests
    └── deploy_test.ts
```

#### Running Tests

```bash
# Run unit tests with coverage (default, no credentials needed)
npm test

# Run a specific test file
npx jest __tests__/ut/deploy_test.ts

# Run integration tests (requires cloud credentials)
npm run test:it

# Update snapshots
npx jest --updateSnapshot
```

#### Test Naming Convention

- Unit test files: `{module}_test.ts`
- Test functions: `describe('{feature}', () => { test('{scenario}', ...) })`

### 5. Building

The project uses Vercel ncc for bundling, which produces a single JavaScript file suitable for distribution.

```bash
# Production build
npm run build

# Development with watch
npm run watch
```

### 6. Pull Request Process

1. Create feature branch from `master`
2. Make changes with tests
3. Run linting: `npm run lint`
4. Fix issues: `npm run fix` if needed
5. Format code: `npm run format`
6. Run tests: `npm test`
7. Create PR with description and test plan

## Project Structure

```
src/
├── commands-help/     # Help documentation for CLI commands
├── default/           # Default configuration handlers
├── interface/         # TypeScript interfaces and types
├── resources/         # Cloud resource management (FC, RAM, SLS, OSS)
├── subCommands/       # CLI subcommand implementations
├── utils/             # Shared utility functions
├── base.ts            # Base class with common functionality
├── constant.ts        # Global constants
├── index.ts           # Main entry point
└── logger.ts          # Logging utilities
```

## Key Subcommands

| Command   | Description                   |
| --------- | ----------------------------- |
| `deploy`  | Deploy functions and triggers |
| `build`   | Build function code/packages  |
| `local`   | Local development and testing |
| `invoke`  | Invoke functions remotely     |
| `info`    | Query function information    |
| `logs`    | Query function logs           |
| `remove`  | Remove deployed resources     |
| `plan`    | Show deployment plan          |
| `layer`   | Manage function layers        |
| `version` | Version management            |
| `alias`   | Alias management              |
| `sync`    | Sync configurations           |

## Debugging

### Local Debugging

```bash
# Start local function
s local start

# Invoke locally with debug mode
s local invoke --debug
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--config", "jestconfig.json"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Resources

- [Serverless Devs Documentation](https://github.com/Serverless-Devs/Serverless-Devs)
- [Alibaba Cloud FC3 Documentation](https://help.aliyun.com/product/fc.html)
- [Architecture Guide](./architecture.md)
