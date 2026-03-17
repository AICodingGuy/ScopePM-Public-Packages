# ScopePM CLI (@scope-pm/cli)

Command-line interface for ScopePM. Install it once to manage project scope from the terminal and configure the hosted MCP proxy for Claude, Cursor, ChatGPT, and similar clients.

## Installation

```bash
npm install -g @scope-pm/cli
```

## Configuration

Set your API key and (optionally) a custom API URL:

```bash
scope config set api-key sk_your_api_key_here
scope config set api-url https://your-custom-api.com
scope config list
```

Configuration is stored in `~/.scope-pm/config.json`.

## MCP Install (Claude/Cursor/ChatGPT)

Write or update MCP client config in one command (merge-safe):

```bash
# Claude Desktop (~/.claude/.mcp.json)
npx @scope-pm/cli install

# Project-local (.mcp.json)
npx @scope-pm/cli install --target project

# Cursor and ChatGPT
npx @scope-pm/cli install --target cursor
npx @scope-pm/cli install --target chatgpt

# All known targets at once
npx @scope-pm/cli install --target all
```

Useful options:

```bash
# Override API URL and key for install
npx @scope-pm/cli install --api-url https://api.aicodingguy.com --api-key sk_live_xxx

# Preview only (no file writes)
npx @scope-pm/cli install --dry-run --json

# Custom config file path
npx @scope-pm/cli install --config-path /absolute/path/to/mcp.json
```

Notes:
- Installer is remote-only and configures `@scope-pm/mcp`.
- Default MCP server entry name is `scope-pm`.
- Existing `mcpServers` entries are preserved.
- If no API key is found, the command prints a warning and you can set `SCOPE_API_KEY` in your MCP client environment.

### Priority Order

API key resolution (highest to lowest):
1. `--api-key` CLI flag
2. `SCOPE_API_KEY` environment variable
3. `~/.scope-pm/config.json`

API URL resolution (highest to lowest):
1. `--api-url` CLI flag
2. `SCOPE_API_URL` environment variable
3. `~/.scope-pm/config.json` (default: `https://api.aicodingguy.com`)

## Usage

### Global Options

| Flag | Description |
|------|-------------|
| `--api-key <key>` | API key for authentication |
| `--api-url <url>` | API base URL |
| `--json` | Output raw JSON instead of human-readable format |

### Commands

#### Status and Overview

```bash
scope status                     # Show scope status overview
scope validate                   # Run all validation rules
scope install                    # Install/update MCP client config
```

#### Query Stories

```bash
scope query                              # List all stories
scope query --status in_progress         # Filter by status
scope query --component core             # Filter by component
scope query --priority critical,high     # Filter by priority
scope query --epic E001                  # Filter by epic
scope query --tags api,auth              # Filter by tags
scope query --search "login"             # Search in titles
scope query --limit 10 --offset 20       # Pagination
```

#### Epics

```bash
scope add-epic --title "Platform v2" --priority high --description "Next gen platform" --business-value "Revenue growth"
scope update-epic E001 --status in_progress
scope update-epic E001 --title "New Title" --priority critical
```

#### Stories

```bash
scope add-story \
  --epic E001 \
  --title "User Authentication" \
  --as-a "user" \
  --i-want "to log in securely" \
  --so-that "my data is protected" \
  --priority high \
  --story-points 5 \
  --component auth \
  --tags "security,auth" \
  --technical-notes "Use JWT with refresh tokens" \
  --business-value "Core security requirement" \
  --acceptance-criteria "Login:User can log in with email||Logout:User can log out"

scope update-story US001 --status in_progress
scope update-story US001 --assigned-to "agent-1"
```

#### Subtasks

```bash
scope add-subtask \
  --story US001 \
  --title "Implement login endpoint" \
  --type backend \
  --hours 4 \
  --description "Create POST /auth/login" \
  --technical-notes "### Approach\nUse bcrypt for password hashing"

scope update-subtask ST001 --status done
scope update-subtask ST001 --technical-notes "### Status\ndone"
```

#### Decisions (ADRs)

```bash
scope add-decision \
  --title "Use server-side Postgres as source of truth" \
  --context "Need consistent data across web app, MCP clients, and coding agents" \
  --decision "Use centralized API + Postgres for all production flows" \
  --consequences "No local DB mode in client installers"
```

#### Comments

```bash
scope add-comment \
  --entity-type story \
  --entity-id US001 \
  --content "Started implementation" \
  --author claude
```

#### Parking Lot

```bash
scope parking-lot list
scope parking-lot list --category tech_debt
scope parking-lot add \
  --title "GraphQL API" \
  --category idea \
  --priority low \
  --description "Consider adding GraphQL support"
```

#### Export

```bash
scope export-json    # Export full scope as JSON
scope export-csv     # Export stories as CSV
```

### JSON Output

Add `--json` to any command to get raw JSON output:

```bash
scope status --json
scope query --status done --json
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SCOPE_API_KEY` | API key for authentication |
| `SCOPE_API_URL` | API base URL |

## License

BUSL-1.1
