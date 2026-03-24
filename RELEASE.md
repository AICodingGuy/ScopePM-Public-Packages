# Release Guide

## Overview

This repository publishes two packages independently:

- `@scope-pm/cli`
- `@scope-pm/mcp`

The GitHub Actions workflow supports:
- manual dispatch
- tag-based release

The workflow now runs on current Node-24-compatible GitHub Action majors:

- `actions/checkout@v6`
- `actions/setup-node@v6`
- workflow runtime `node-version: 24`

## Local verification before release

```bash
npm ci
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
git tag cli-vX.Y.Z
git push origin cli-vX.Y.Z
```

### MCP only

```bash
git tag mcp-vX.Y.Z
git push origin mcp-vX.Y.Z
```

## Manual publish via workflow_dispatch

Use the `Public Package Release` workflow and choose:
- `verify` — non-destructive build/test/typecheck only
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

## Failure classification

Not every failed release run means the workflow is broken.

- `Node 20 actions are deprecated`:
  - workflow/runtime drift
  - should be fixed in the workflow file
- `Dependencies lock file is not found`:
  - repository packaging/install issue
  - not an npm publish permission issue
- `E403 You cannot publish over the previously published versions`:
  - expected when re-running a publish for an already-published version
  - release logic is fine; version/tag needs to move forward
- `E404 ... package is not in this registry` during first publish attempts:
  - npm namespace/package publication state issue
  - not evidence that checkout/setup/build steps are broken

## Important note

This repository is only the public distribution surface.
The private main ScopePM product repository remains the source of truth for broader product development.
