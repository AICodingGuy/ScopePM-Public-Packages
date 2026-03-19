/**
 * CLI argument parser and configuration for the MCP proxy client.
 * No heavy dependencies — uses manual process.argv parsing.
 */

import { createRequire } from 'node:module';

export interface ProxyConfig {
  command: 'serve' | 'connect';
  apiKey: string;
  apiUrl: string;
  transport: 'http';
  showHelp: boolean;
  showVersion: boolean;
}

const DEFAULT_API_URL = 'https://api.aicodingguy.com';

/**
 * Parse CLI args (--api-key, --api-url, --help, --version)
 * with env variable fallback (SCOPE_API_KEY, SCOPE_API_URL).
 *
 * Throws if no API key is available (unless --help or --version is set).
 */
export function parseConfig(): ProxyConfig {
  const args = process.argv.slice(2);

  let command: ProxyConfig['command'] = 'serve';
  if (args[0] === 'connect') {
    command = 'connect';
    args.shift();
  }

  let apiKey: string | undefined;
  let apiUrl: string | undefined;
  let transport: 'http' = 'http';
  let showHelp = false;
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--api-key':
        apiKey = args[++i];
        break;
      case '--api-url':
        apiUrl = args[++i];
        break;
      case '--transport': {
        const value = args[++i];
        if (value === 'http') {
          transport = 'http';
          break;
        }
        throw new Error(`Unsupported transport: ${value}. Only "http" is supported in @scope-pm/mcp.`);
      }
      case '--help':
      case '-h':
        showHelp = true;
        break;
      case '--version':
      case '-v':
        showVersion = true;
        break;
      default:
        // Handle --api-key=value format
        if (arg.startsWith('--api-key=')) {
          apiKey = arg.split('=').slice(1).join('=');
        } else if (arg.startsWith('--api-url=')) {
          apiUrl = arg.split('=').slice(1).join('=');
        } else if (arg.startsWith('--transport=')) {
          const value = arg.split('=').slice(1).join('=');
          if (value === 'http') {
            transport = 'http';
          } else {
            throw new Error(`Unsupported transport: ${value}. Only "http" is supported in @scope-pm/mcp.`);
          }
        }
        break;
    }
  }

  // Env variable fallback
  if (!apiKey) {
    apiKey = process.env.SCOPE_API_KEY;
  }
  if (!apiUrl) {
    apiUrl = process.env.SCOPE_API_URL;
  }

  // Default API URL
  if (!apiUrl) {
    apiUrl = DEFAULT_API_URL;
  }

  // Strip trailing slash
  if (apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
  }

  // If help or version is requested, skip API key validation
  if (showHelp || showVersion) {
    return {
      command,
      apiKey: apiKey ?? '',
      apiUrl,
      transport,
      showHelp,
      showVersion,
    };
  }

  // Validate API key is present
  if (!apiKey) {
    throw new Error(
      `API key is required. Provide it via:\n` +
      `  --api-key sk_your_key\n` +
      `  or set SCOPE_API_KEY environment variable\n\n` +
      `Example:\n` +
      `  npx -y @scope-pm/mcp --transport http --api-key sk_your_key\n\n` +
      `Get your API key at https://scopepm.aicodingguy.com/settings/api-keys`,
    );
  }

  return {
    command,
    apiKey,
    apiUrl,
    transport,
    showHelp,
    showVersion,
  };
}

export function printHelp(): void {
  process.stderr.write(`
@scope-pm/mcp - MCP proxy for the ScopePM REST API

USAGE:
  npx -y @scope-pm/mcp --transport http --api-key sk_your_key [--api-url https://api.aicodingguy.com]
  npx -y @scope-pm/mcp connect --api-key sk_your_key [--api-url https://api.aicodingguy.com]

OPTIONS:
  --api-key <key>   API key for authentication (required)
                    Fallback: SCOPE_API_KEY env variable
  --api-url <url>   Base URL of the ScopePM API (default: https://api.aicodingguy.com)
                    Fallback: SCOPE_API_URL env variable
  --transport <t>   Transport mode (only: http)
  --help, -h        Show this help message
  --version, -v     Show version number

CONNECT CHECK:
  Use the \`connect\` subcommand to verify the API URL + API key pair before wiring
  the package into Claude/Cursor:

    npx -y @scope-pm/mcp connect --api-key sk_your_key

CLAUDE CODE SETUP:
  Add to your .mcp.json:
  {
    "mcpServers": {
      "scope": {
        "command": "npx",
        "args": ["-y", "@scope-pm/mcp", "--transport", "http", "--api-key", "sk_your_key"]
      }
    }
  }

CURSOR SETUP:
  Add to your .cursor/mcp.json:
  {
    "mcpServers": {
      "scope": {
        "command": "npx",
        "args": ["-y", "@scope-pm/mcp", "--transport", "http", "--api-key", "sk_your_key"]
      }
    }
  }
`);
}

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version?: string };

export const VERSION = pkg.version ?? '0.1.1';
