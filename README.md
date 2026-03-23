# ScopePM Public Packages

Public distribution repository for the installable ScopePM developer tools.

Packages in this repository:

- `@scope-pm/cli`
- `@scope-pm/mcp`

This repository is intentionally separate from the private ScopePM product monorepo.
It contains only the publishable packages, package-focused documentation, and the release workflow required to publish them on npm.

## What is included

### `@scope-pm/cli`
A hosted REST CLI for ScopePM.

Use it to:
- inspect scope status
- query and update work items
- export scope data
- install/update MCP configuration for local tools

### `@scope-pm/mcp`
A hosted MCP proxy for ScopePM.

Use it to:
- connect Claude Code, Claude Desktop, Codex, Cursor, ChatGPT Desktop, and other MCP clients to the hosted ScopePM API
- expose ScopePM tools over stdio transport
- verify API connectivity with the `connect` subcommand

## Quick install

### CLI

```bash
npm install -g @scope-pm/cli
scope --help
```

### MCP

```bash
npx @scope-pm/mcp@0.1.6 --help
npx @scope-pm/mcp@0.1.6 connect --api-key sk_your_key --api-url https://api.aicodingguy.com
```

## Supported client setups

The public docs now include installation/configuration examples for:

- Claude Code
- Claude Desktop
- Codex / Codex CLI-style MCP configuration
- Cursor
- ChatGPT Desktop
- generic MCP clients

## Documentation

- Installation guide: [`INSTALLATION.md`](./INSTALLATION.md)
- Release and publish guide: [`RELEASE.md`](./RELEASE.md)
- Private-to-public sync process: [`SYNC_FROM_PRIVATE.md`](./SYNC_FROM_PRIVATE.md)

## Local development

```bash
npm install
npm run test
npm run typecheck
npm run build
```

## Repository purpose

This repository should contain only:
- package source
- tests
- package documentation
- release automation

This repository should not contain:
- the private ScopePM API server
- the database layer of the private product monorepo
- the web application
- internal reports or internal operational documents

## License

BUSL-1.1
