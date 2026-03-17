# Release Guide

## Overview

This repository publishes two packages independently:

- `@scope-pm/cli`
- `@scope-pm/mcp`

The GitHub Actions workflow supports:
- manual dispatch
- tag-based release

## Local verification before release

```bash
npm install
npm run test
npm run typecheck
npm run build
npm pack --dry-run --json --workspace @scope-pm/cli
npm pack --dry-run --json --workspace @scope-pm/mcp
```

## Publish requirements

GitHub repository secrets:
- `NPM_TOKEN`

Required npm permissions:
- publish access to `@scope-pm/cli`
- publish access to `@scope-pm/mcp`

## Tag-based publish

### CLI only

```bash
git tag cli-v0.1.0
git push origin cli-v0.1.0
```

### MCP only

```bash
git tag mcp-v0.1.0
git push origin mcp-v0.1.0
```

## Manual publish via workflow_dispatch

Use the `Public Package Release` workflow and choose:
- `cli`
- `mcp`
- `all`

## Post-publish verification

```bash
npm view @scope-pm/cli version
npm view @scope-pm/mcp version
npx @scope-pm/mcp --help
scope --help
```

## Important note

This repository is only the public distribution surface.
The private main ScopePM product repository remains the source of truth for broader product development.
