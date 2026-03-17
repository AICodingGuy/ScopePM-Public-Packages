#!/usr/bin/env node

/**
 * @scope-pm/mcp — MCP Proxy for the ScopePM REST API
 *
 * A lightweight MCP server that proxies all tool calls to the hosted
 * ScopePM REST API. Runs over stdio transport.
 *
 * Usage:
 *   npx -y @scope-pm/mcp --transport http --api-key sk_your_key
 *   npx -y @scope-pm/mcp --transport http --api-key sk_your_key --api-url https://custom-api.example.com
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseConfig, printHelp, VERSION } from './config.js';
import { checkConnection } from './connect.js';
import {
  getToolDefinitions,
  callApi,
  formatMcpResponse,
  listResourcesFromApi,
  listPromptsFromApi,
  getPromptFromApi,
  normalizeGetPromptResponse,
  normalizeListPromptsResponse,
  readResourceFromApi,
  TOOL_REGISTRY,
} from './tool-registry.js';

type McpErrorResult = {
  isError: true;
  content: Array<{ type: string; text: string }>;
};

function isMcpErrorResult(value: unknown): value is McpErrorResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isError' in value &&
    (value as { isError?: unknown }).isError === true &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function extractMcpErrorMessage(value: McpErrorResult): string {
  const first = value.content[0];
  return typeof first?.text === 'string' && first.text.length > 0 ? first.text : 'Unknown MCP proxy error';
}

function normalizeListResourcesResponse(apiResult: unknown): {
  resources: Array<{ uri: string; name: string; description: string; mimeType: string }>;
} {
  if (isMcpErrorResult(apiResult)) {
    throw new Error(extractMcpErrorMessage(apiResult));
  }

  const directResources = (apiResult as { resources?: unknown } | null)?.resources;
  if (Array.isArray(directResources)) {
    return {
      resources: directResources as Array<{ uri: string; name: string; description: string; mimeType: string }>,
    };
  }

  const wrappedResources = (apiResult as { ok?: unknown; data?: { resources?: unknown } } | null)?.data?.resources;
  if (Array.isArray(wrappedResources)) {
    return {
      resources: wrappedResources as Array<{ uri: string; name: string; description: string; mimeType: string }>,
    };
  }

  throw new Error('Invalid resources/list response format from API');
}

function normalizeReadResourceResponse(apiResult: unknown): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} {
  if (isMcpErrorResult(apiResult)) {
    throw new Error(extractMcpErrorMessage(apiResult));
  }

  const directContents = (apiResult as { contents?: unknown } | null)?.contents;
  if (Array.isArray(directContents)) {
    return { contents: directContents as Array<{ uri: string; mimeType: string; text: string }> };
  }

  const wrappedContents = (apiResult as { ok?: unknown; data?: { contents?: unknown } } | null)?.data?.contents;
  if (Array.isArray(wrappedContents)) {
    return { contents: wrappedContents as Array<{ uri: string; mimeType: string; text: string }> };
  }

  throw new Error('Invalid resources/read response format from API');
}

async function main(): Promise<void> {
  // Parse configuration
  let config;
  try {
    config = parseConfig();
  } catch (err: unknown) {
    process.stderr.write(`Error: ${(err as Error).message}\n`);
    process.exit(1);
  }

  // Handle --help
  if (config.showHelp) {
    printHelp();
    process.exit(0);
  }

  // Handle --version
  if (config.showVersion) {
    process.stderr.write(`@scope-pm/mcp v${VERSION}\n`);
    process.exit(0);
  }

  if (config.command === 'connect') {
    try {
      const result = await checkConnection(config.apiUrl, config.apiKey);
      process.stdout.write(
        JSON.stringify({
          ok: true,
          data: {
            api_url: result.apiUrl,
            summary: result.summary,
          },
        }, null, 2) + '\n',
      );
      process.exit(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown connection error';
      process.stderr.write(`[scope-mcp] ${message}\n`);
      process.exit(1);
    }
  }

  // Log startup info to stderr (stdout is reserved for MCP transport)
  process.stderr.write(`[scope-mcp] Starting MCP proxy v${VERSION}\n`);
  process.stderr.write(`[scope-mcp] API URL: ${config.apiUrl}\n`);
  process.stderr.write(`[scope-mcp] API Key: ${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}\n`);
  process.stderr.write(`[scope-mcp] Registered ${Object.keys(TOOL_REGISTRY).length} tools\n`);

  // Create MCP server
  const server = new Server(
    { name: '@scope-pm/mcp', version: VERSION },
    { capabilities: { tools: {}, resources: {}, prompts: {} } },
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, () => {
    const tools = getToolDefinitions();
    return { tools };
  });

  // List resources handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    process.stderr.write('[scope-mcp] Listing resources\n');
    const apiResult = await listResourcesFromApi(config.apiUrl, config.apiKey);
    return normalizeListResourcesResponse(apiResult);
  });

  // Read resource handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (typeof uri !== 'string' || uri.trim().length === 0) {
      throw new Error('ReadResource requires a non-empty uri');
    }
    process.stderr.write(`[scope-mcp] Reading resource ${uri}\n`);
    const apiResult = await readResourceFromApi(uri, config.apiUrl, config.apiKey);
    return normalizeReadResourceResponse(apiResult);
  });

  // List prompts handler
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    process.stderr.write('[scope-mcp] Listing prompts\n');
    const apiResult = await listPromptsFromApi(config.apiUrl, config.apiKey);
    return normalizeListPromptsResponse(apiResult);
  });

  // Get prompt handler
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const promptName = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, string>;
    process.stderr.write(`[scope-mcp] Getting prompt ${promptName}\n`);
    const apiResult = await getPromptFromApi(promptName, args, config.apiUrl, config.apiKey);
    return normalizeGetPromptResponse(apiResult);
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;

    // Check if tool exists
    if (!TOOL_REGISTRY[toolName]) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              error: { code: 'UNKNOWN_TOOL', message: `Unknown tool: ${toolName}` },
            }),
          },
        ],
        isError: true,
      };
    }

    process.stderr.write(`[scope-mcp] Calling ${toolName}\n`);

    try {
      const apiResult = await callApi(toolName, args, config.apiUrl, config.apiKey);
      return formatMcpResponse(apiResult);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      process.stderr.write(`[scope-mcp] Error in ${toolName}: ${errorMessage}\n`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: false,
              error: { code: 'PROXY_ERROR', message: errorMessage },
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    process.stderr.write('[scope-mcp] Shutting down...\n');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[scope-mcp] MCP server connected and ready\n');
}

main().catch((err) => {
  process.stderr.write(`[scope-mcp] Fatal error: ${(err as Error).message}\n`);
  process.exit(1);
});
