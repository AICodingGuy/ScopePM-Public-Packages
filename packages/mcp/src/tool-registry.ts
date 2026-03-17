/**
 * Tool Registry: Maps MCP tool names to REST API endpoints.
 *
 * Each entry defines:
 *   - method: HTTP method (GET, POST, PUT, DELETE)
 *   - path: API path with optional :param placeholders
 *   - paramMapping: maps tool input field names to path parameter names
 *   - queryParams: for GET requests, list of input fields to pass as query params
 *   - description: Tool description for MCP protocol
 *   - inputSchema: JSON Schema for MCP tool listing
 */
import { TOOL_DEFINITIONS } from './tool-definitions.generated.js';
import { EXPLICIT_TOOL_REGISTRY } from './tool-registry-explicit.js';

export interface ToolRegistryEntry {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  paramMapping?: Record<string, string>;
  queryParams?: string[];
  flattenFilter?: boolean;
  proxyToolName?: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

function buildMergedRegistry(): Record<string, ToolRegistryEntry> {
  const merged: Record<string, ToolRegistryEntry> = { ...EXPLICIT_TOOL_REGISTRY };

  for (const def of TOOL_DEFINITIONS) {
    const explicit = merged[def.name];
    if (explicit) {
      // Keep route/method overrides, but sync description/schema from the generated tool source.
      merged[def.name] = {
        ...explicit,
        description: def.description,
        inputSchema: def.inputSchema,
      };
      continue;
    }

    // Fallback for tools without an explicit REST mapping:
    // call the generic MCP dispatch endpoint server-side.
    merged[def.name] = {
      method: 'POST',
      path: '/api/mcp/call',
      proxyToolName: def.name,
      description: def.description,
      inputSchema: def.inputSchema,
    };
  }

  return merged;
}

export const TOOL_REGISTRY: Record<string, ToolRegistryEntry> = buildMergedRegistry();

// ========================
// Request Builder
// ========================

export interface BuiltRequest {
  url: string;
  method: string;
  body?: Record<string, unknown>;
}

/**
 * Build an HTTP request from a tool name and its parameters.
 * - Substitutes path params from paramMapping
 * - For GET: remaining params become query string
 * - For POST/PUT/DELETE: remaining params become JSON body
 */
export function buildRequest(
  toolName: string,
  params: Record<string, unknown>,
  baseUrl: string,
): BuiltRequest {
  const entry = TOOL_REGISTRY[toolName];
  if (!entry) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  if (entry.proxyToolName) {
    return {
      url: `${baseUrl}${entry.path}`,
      method: 'POST',
      body: {
        name: entry.proxyToolName,
        arguments: params,
      },
    };
  }

  let path = entry.path;
  const consumedParams = new Set<string>();

  // Substitute path parameters
  if (entry.paramMapping) {
    for (const [inputField, pathParam] of Object.entries(entry.paramMapping)) {
      const value = params[inputField];
      if (value !== undefined) {
        path = path.replace(`:${pathParam}`, encodeURIComponent(String(value)));
        consumedParams.add(inputField);
      }
    }
  }

  // Build remaining params (excluding consumed path params)
  const remainingParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!consumedParams.has(key) && value !== undefined && value !== null) {
      remainingParams[key] = value;
    }
  }

  if (entry.method === 'GET') {
    // Flatten filter object for query params (scope_query sends filter.epic_id, filter.status etc.)
    const queryParts: string[] = [];
    const flatParams: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(remainingParams)) {
      if (entry.flattenFilter && key === 'filter' && typeof value === 'object' && value !== null) {
        // Flatten filter object into top-level query params
        for (const [filterKey, filterValue] of Object.entries(value as Record<string, unknown>)) {
          if (filterValue !== undefined && filterValue !== null) {
            flatParams[filterKey] = filterValue;
          }
        }
      } else {
        flatParams[key] = value;
      }
    }

    for (const [key, value] of Object.entries(flatParams)) {
      if (Array.isArray(value)) {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`);
      } else if (typeof value === 'object' && value !== null) {
        // Skip complex nested objects in query params
        continue;
      } else {
        queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
    }

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    return {
      url: `${baseUrl}${path}${queryString}`,
      method: 'GET',
    };
  }

  // POST / PUT / DELETE
  const hasBody = Object.keys(remainingParams).length > 0;
  return {
    url: `${baseUrl}${path}`,
    method: entry.method,
    body: hasBody ? remainingParams : (entry.method === 'DELETE' ? undefined : remainingParams),
  };
}

// ========================
// API Caller with Retry
// ========================

interface McpErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

function mcpError(message: string): McpErrorResponse {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

function isMcpErrorResult(value: unknown): value is McpErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isError' in value &&
    (value as { isError?: unknown }).isError === true &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

function extractMcpErrorMessage(value: McpErrorResponse): string {
  const first = value.content[0];
  return typeof first?.text === 'string' && first.text.length > 0 ? first.text : 'Unknown MCP proxy error';
}

async function callEndpoint(
  url: string,
  method: HttpMethod,
  body: Record<string, unknown> | undefined,
  apiKey: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'X-API-Key': apiKey,
    Accept: 'application/json',
    'User-Agent': '@scope-pm/mcp/0.1.1',
  };

  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) fetchOptions.body = JSON.stringify(body);

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok) {
        try {
          return await response.json();
        } catch {
          const text = await response.text();
          return text;
        }
      }

      if (response.status === 401) {
        return mcpError(
          'Authentication failed (401). Check your API key.\n' +
            'Make sure SCOPE_API_KEY is valid or pass --api-key with a valid key.',
        );
      }

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          process.stderr.write(
            `[scope-mcp] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...\n`,
          );
          await sleep(delay);
          continue;
        }
        return mcpError(`Rate limited (429) after ${MAX_RETRIES} retries. Please try again later.`);
      }

      if (response.status >= 500) {
        let errorBody = '';
        try {
          const json = (await response.json()) as { error?: string; message?: string };
          errorBody = json.error ?? json.message ?? JSON.stringify(json);
        } catch {
          errorBody = await response.text().catch(() => 'Unknown error');
        }
        return mcpError(`Server error (${response.status}): ${errorBody}`);
      }

      try {
        const errorJson = await response.json();
        return errorJson;
      } catch {
        const errorText = await response.text().catch(() => 'Unknown error');
        return mcpError(`API error (${response.status}): ${errorText}`);
      }
    } catch (err: unknown) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
        process.stderr.write(
          `[scope-mcp] Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...\n`,
        );
        await sleep(delay);
        continue;
      }
    }
  }

  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown network error';
  const cause = lastError instanceof Error && lastError.cause ? ` (cause: ${lastError.cause})` : '';
  return mcpError(`Network error calling ${url}: ${errorMessage}${cause}`);
}

/**
 * Call the ScopePM REST API and return the response.
 * Handles:
 *   - 401 → authentication error
 *   - 429 → exponential backoff retry (max 3)
 *   - 500+ → server error
 *   - Network errors → graceful error message
 */
export async function callApi(
  toolName: string,
  params: Record<string, unknown>,
  baseUrl: string,
  apiKey: string,
): Promise<unknown> {
  const { url, method, body } = buildRequest(toolName, params, baseUrl);
  return callEndpoint(url, method as HttpMethod, body, apiKey);
}

export async function listResourcesFromApi(baseUrl: string, apiKey: string): Promise<unknown> {
  return callEndpoint(`${baseUrl}/api/mcp/resources`, 'GET', undefined, apiKey);
}

export async function readResourceFromApi(uri: string, baseUrl: string, apiKey: string): Promise<unknown> {
  const query = new URLSearchParams({ uri });
  return callEndpoint(`${baseUrl}/api/mcp/resources/read?${query.toString()}`, 'GET', undefined, apiKey);
}

export async function listPromptsFromApi(baseUrl: string, apiKey: string): Promise<unknown> {
  return callEndpoint(`${baseUrl}/api/mcp/prompts`, 'GET', undefined, apiKey);
}

export async function getPromptFromApi(
  name: string,
  args: Record<string, string>,
  baseUrl: string,
  apiKey: string,
): Promise<unknown> {
  return callEndpoint(`${baseUrl}/api/mcp/prompts/get`, 'POST', { name, arguments: args }, apiKey);
}

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('econnreset') || msg.includes('econnrefused') || msg.includes('etimedout');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========================
// MCP Response Formatting
// ========================

/**
 * Format an API response into MCP protocol format.
 * - If it's already an MCP error (isError), pass through
 * - Otherwise wrap as MCP text content
 */
export function formatMcpResponse(apiResult: unknown): {
  content: Array<{ type: string; text: string }>;
  isError?: true;
} {
  // Already an MCP error response
  if (
    typeof apiResult === 'object' &&
    apiResult !== null &&
    'isError' in apiResult &&
    (apiResult as { isError: boolean }).isError === true
  ) {
    return apiResult as McpErrorResponse;
  }

  // Format as MCP text content
  const text = typeof apiResult === 'string'
    ? JSON.stringify(apiResult)
    : JSON.stringify(apiResult, null, 2);

  return {
    content: [{ type: 'text', text }],
  };
}

export function normalizeListPromptsResponse(apiResult: unknown): {
  prompts: Array<{ name: string; description?: string; arguments?: unknown[] }>;
} {
  if (isMcpErrorResult(apiResult)) {
    throw new Error(extractMcpErrorMessage(apiResult));
  }

  const directPrompts = (apiResult as { prompts?: unknown } | null)?.prompts;
  if (Array.isArray(directPrompts)) {
    return { prompts: directPrompts as Array<{ name: string; description?: string; arguments?: unknown[] }> };
  }

  const wrappedPrompts = (apiResult as { ok?: unknown; data?: { prompts?: unknown } } | null)?.data?.prompts;
  if (Array.isArray(wrappedPrompts)) {
    return { prompts: wrappedPrompts as Array<{ name: string; description?: string; arguments?: unknown[] }> };
  }

  throw new Error('Invalid prompts/list response format from API');
}

export function normalizeGetPromptResponse(apiResult: unknown): {
  description?: string;
  messages: Array<{ role: string; content: { type: string; text: string } }>;
} {
  if (isMcpErrorResult(apiResult)) {
    throw new Error(extractMcpErrorMessage(apiResult));
  }

  const directMessages = (apiResult as { messages?: unknown; description?: string } | null)?.messages;
  if (Array.isArray(directMessages)) {
    return {
      description: (apiResult as { description?: string } | null)?.description,
      messages: directMessages as Array<{ role: string; content: { type: string; text: string } }>,
    };
  }

  const wrapped = (apiResult as {
    ok?: unknown;
    data?: { messages?: unknown; description?: string };
  } | null)?.data;
  if (Array.isArray(wrapped?.messages)) {
    return {
      description: wrapped.description,
      messages: wrapped.messages as Array<{ role: string; content: { type: string; text: string } }>,
    };
  }

  throw new Error('Invalid prompts/get response format from API');
}

// ========================
// Tool Definitions for MCP
// ========================

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Get all tool definitions for MCP ListTools response.
 */
export function getToolDefinitions(): ToolDefinition[] {
  return Object.entries(TOOL_REGISTRY).map(([name, entry]) => ({
    name,
    description: entry.description,
    inputSchema: entry.inputSchema,
  }));
}
