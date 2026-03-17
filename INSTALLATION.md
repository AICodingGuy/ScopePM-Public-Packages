# Installation Guide

## Install `@scope-pm/cli`

```bash
npm install -g @scope-pm/cli
```

Configure it:

```bash
scope config set api-key sk_your_api_key_here
scope config set api-url https://api.aicodingguy.com
scope config list
```

Use it:

```bash
scope status
scope query --status in_progress
scope install --target project
```

## Install `@scope-pm/mcp`

You typically do not install it globally.
Use it through `npx` from your MCP client configuration.

### Quick connectivity check

```bash
npx @scope-pm/mcp connect --api-key sk_your_api_key_here
```

### Claude Code example

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "scopepm": {
      "command": "npx",
      "args": ["@scope-pm/mcp", "--api-key", "sk_your_api_key_here"]
    }
  }
}
```

### Cursor example

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "scopepm": {
      "command": "npx",
      "args": ["@scope-pm/mcp", "--api-key", "sk_your_api_key_here"]
    }
  }
}
```

### ChatGPT / custom MCP clients

Use the same command pattern:

```bash
npx @scope-pm/mcp --api-key sk_your_api_key_here
```

## Supported environment variables

### CLI
- `SCOPE_API_KEY`
- `SCOPE_API_URL`

### MCP
- `SCOPE_API_KEY`
- `SCOPE_API_URL`

## Minimum runtime

- Node.js `>= 18`
