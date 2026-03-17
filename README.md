# ScopePM Public Packages

Public distribution repository for the two installable ScopePM packages:

- `@scope-pm/cli`
- `@scope-pm/mcp`

This repo is intentionally separate from the private ScopePM product monorepo.
It contains only the publishable client/proxy packages and the release workflow needed to ship them on npm.

## Packages

### `@scope-pm/cli`
Hosted REST CLI for ScopePM, including MCP installer/configuration helpers.

### `@scope-pm/mcp`
Hosted MCP proxy that exposes ScopePM tools over stdio and forwards them to the hosted API.

## Local Development

```bash
npm install
npm run test
npm run typecheck
npm run build
```

## Release

The GitHub Actions workflow publishes both packages on version tags:

```bash
git tag cli-v0.1.0
git push origin cli-v0.1.0

git tag mcp-v0.1.0
git push origin mcp-v0.1.0
```

Or publish both together with a manual workflow dispatch.
