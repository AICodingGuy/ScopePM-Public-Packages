# Sync From Private Repo

This repository is the public distribution surface for ScopePM packages.
The product monorepo stays private.

## What belongs here

- `packages/cli`
- `packages/mcp`
- package-focused docs
- package-focused CI/release automation

## What does not belong here

- API server runtime
- database migrations unrelated to package shipping
- web app
- internal reports
- private ops configuration

## Recommended sync process

1. Implement and verify package changes in the private product repo.
2. Copy only the affected package files into this repo.
3. Run:
   - `npm install`
   - `npm run test`
   - `npm run typecheck`
   - `npm run build`
   - `npm pack --dry-run --json --workspace @scope-pm/cli`
   - `npm pack --dry-run --json --workspace @scope-pm/mcp`
4. Commit here.
5. Tag and publish from this repo.

## Current known caveat

`@scope-pm/mcp` must not depend on unpublished private packages. The stale `@scope-pm/shared` dependency was removed in this public repo scaffold because the package source does not actually import it.
