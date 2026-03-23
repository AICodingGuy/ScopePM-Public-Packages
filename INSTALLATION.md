# Installation Guide

## Package roles

- `@scope-pm/cli`: terminal CLI for ScopePM
- `@scope-pm/mcp`: MCP proxy process used by editor/desktop MCP clients

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

## Use `@scope-pm/mcp`

You usually do **not** install the MCP package globally.
MCP clients typically launch it with `npx`.

### Quick connectivity check

```bash
npx @scope-pm/mcp connect --api-key sk_your_api_key_here --api-url https://api.aicodingguy.com
```

## Client-specific setup

### Claude Code

Project-local `.mcp.json` or `~/.claude/.mcp.json`:

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

### Claude Desktop

Typical config location:
- macOS/Linux: `~/.claude/.mcp.json`
- Windows: your Claude Desktop MCP config path if customized, otherwise use the same JSON structure Claude expects

Config example:

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

You can also let the CLI write the file:

```bash
npx @scope-pm/cli install --target claude
```

### Codex / Codex CLI-style MCP config

If your Codex environment reads a standard `.mcp.json`, use the same config as Claude Code:

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

If your setup expects a custom config path, point it at the same command.

### Cursor

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

Or use:

```bash
npx @scope-pm/cli install --target cursor
```

### ChatGPT Desktop

The CLI supports a ChatGPT Desktop target:

```bash
npx @scope-pm/cli install --target chatgpt
```

Manual MCP config uses the same command pattern:

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

Typical config path resolution used by the CLI:
- macOS: `~/Library/Application Support/ChatGPT/mcp.json`
- Windows: `%APPDATA%/ChatGPT/mcp.json`
- Linux: `~/.config/chatgpt/mcp.json`

### Generic MCP clients

Use the same command pattern:

```bash
npx @scope-pm/mcp --transport http --api-key sk_your_api_key_here --api-url https://api.aicodingguy.com
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
