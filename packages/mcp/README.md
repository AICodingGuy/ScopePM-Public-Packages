# @scope-pm/mcp

A lightweight MCP (Model Context Protocol) proxy that connects AI coding assistants to the [ScopePM](https://scopepm.aicodingguy.com) REST API. Install it once and every MCP-compatible tool (Claude Code, Cursor, Windsurf, etc.) gets full access to your project scope.

## Quick Start

### Claude Code

Add to your `.mcp.json` (project root or `~/.claude/.mcp.json`):

```json
{
  "mcpServers": {
    "scope": {
      "command": "npx",
      "args": ["@scope-pm/mcp@0.1.6", "--api-key", "sk_your_key"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "scope": {
      "command": "npx",
      "args": ["@scope-pm/mcp@0.1.6", "--api-key", "sk_your_key"]
    }
  }
}
```

### Windsurf / Other MCP Clients

Same pattern -- point the MCP client at:

```
npx @scope-pm/mcp@0.1.6 --api-key sk_your_key
```

### Connectivity Check

Before wiring the MCP server into your editor, you can verify the API URL + API key:

```bash
npx @scope-pm/mcp@0.1.6 connect --api-key sk_your_key
```

## Configuration

| Option | Env Variable | Default | Description |
|---|---|---|---|
| `--transport` | - | `http` | Transport mode. Only `http` is supported in the hosted proxy path. |
| `--api-key` | `SCOPE_API_KEY` | (required) | Your ScopePM API key |
| `--api-url` | `SCOPE_API_URL` | `https://api.aicodingguy.com` | Base URL of the API |
| `connect` | - | - | Verify that the API URL + API key can reach your ScopePM instance |
| `--help` | | | Show help message |
| `--version` | | | Show version number |

Environment variables are used as fallback when CLI flags are not provided.

## Available Tools

The proxy registers all ScopePM MCP tools:

### Write Tools
- `scope_add_epic` -- Create a new epic
- `scope_update_epic` -- Update an epic
- `scope_add_story` -- Create a user story
- `scope_update_story` -- Update a story
- `scope_add_subtask` -- Add a subtask
- `scope_update_subtask` -- Update a subtask
- `scope_add_decision` -- Create an ADR
- `scope_add_comment` -- Add a comment
- `scope_add_dependency` / `scope_remove_dependency` -- Manage dependencies
- `scope_add_parking_lot_item` / `scope_update_parking_lot_item` -- Parking lot management
- `scope_promote_parking_lot_item` -- Promote to story
- `scope_add_review` / `scope_resolve_review` / `scope_request_review` -- Reviews
- `scope_bulk_add_stories` -- Bulk story creation
- `scope_batch` -- Batch operations
- `scope_quick_fix` -- Quick fix documentation

### Read Tools
- `scope_status` -- Scope overview
- `scope_query` -- Query stories with filters
- `scope_validate` -- Run validation rules
- `scope_sort` -- Topological sort
- `scope_export_json` / `scope_export_csv` / `scope_export_markdown` -- Export
- `scope_graph` -- Dependency graph (Mermaid)
- `scope_get_reviews` -- Get review annotations
- `scope_list_parking_lot` -- List parking lot items

### Workflow Tools
- `scope_what_next` -- Next actionable story suggestion
- `scope_session_summary` -- Session context recovery
- `scope_plan_sprints` -- Sprint planning
- `scope_plan_execution` -- Execution plan for a story
- `scope_events` -- Event log query
- `scope_detect_conflicts` -- Agent conflict detection
- `scope_diff` -- Snapshot diff

## How It Works

```
AI Assistant <--MCP/stdio--> @scope-pm/mcp <--HTTPS--> api.aicodingguy.com
```

1. The AI assistant sends MCP tool calls over stdio
2. `@scope-pm/mcp` translates them to REST API calls
3. API responses are formatted back as MCP content
4. Rate limiting (429) is handled with exponential backoff (max 3 retries)

This package is intentionally a stdio MCP proxy with an HTTP backend. Self-hosted direct DB access stays in `packages/api/bin/scope-mcp.ts --local`; hosted users should use the proxy path above.

## Error Handling

- **401 Unauthorized** -- Check your API key
- **429 Rate Limited** -- Automatic retry with exponential backoff
- **500 Server Error** -- Error details returned to the AI assistant
- **Network Errors** -- Graceful error messages with retry for transient failures

## Development

```bash
# Run tests
npm test

# Run HTTP proxy overhead benchmark
node --import tsx scripts/benchmark-http-proxy.ts

# Build
npm run build

# Type check
npm run typecheck
```

## License

BUSL-1.1
