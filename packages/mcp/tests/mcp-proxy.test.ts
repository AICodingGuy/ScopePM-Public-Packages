import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Config Parser Tests ----

describe('Config Parser', () => {
  let originalArgv: string[];
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalArgv = process.argv;
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it('parses --api-key from CLI args', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_test_123'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiKey).toBe('sk_test_123');
  });

  it('parses --api-url from CLI args', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_test_123', '--api-url', 'https://custom.example.com'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiUrl).toBe('https://custom.example.com');
  });

  it('parses --transport http from CLI args', async () => {
    process.argv = ['node', 'index.js', '--transport', 'http', '--api-key', 'sk_test_123'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.transport).toBe('http');
  });

  it('uses default API URL when not specified', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_test_123'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiUrl).toBe('https://api.aicodingguy.com');
  });

  it('falls back to SCOPE_API_KEY env variable', async () => {
    process.argv = ['node', 'index.js'];
    process.env.SCOPE_API_KEY = 'sk_env_key';
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiKey).toBe('sk_env_key');
    delete process.env.SCOPE_API_KEY;
  });

  it('falls back to SCOPE_API_URL env variable', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_test_123'];
    process.env.SCOPE_API_URL = 'https://env.example.com';
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiUrl).toBe('https://env.example.com');
    delete process.env.SCOPE_API_URL;
  });

  it('CLI args take precedence over env variables', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_cli', '--api-url', 'https://cli.example.com'];
    process.env.SCOPE_API_KEY = 'sk_env';
    process.env.SCOPE_API_URL = 'https://env.example.com';
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiKey).toBe('sk_cli');
    expect(config.apiUrl).toBe('https://cli.example.com');
  });

  it('throws error when no API key is provided', async () => {
    process.argv = ['node', 'index.js'];
    delete process.env.SCOPE_API_KEY;
    const { parseConfig } = await import('../src/config.js');
    expect(() => parseConfig()).toThrow(/API key/);
  });

  it('rejects unsupported transport values', async () => {
    process.argv = ['node', 'index.js', '--transport', 'stdio', '--api-key', 'sk_test_123'];
    const { parseConfig } = await import('../src/config.js');
    expect(() => parseConfig()).toThrow(/Unsupported transport/);
  });

  it('detects --help flag', async () => {
    process.argv = ['node', 'index.js', '--help'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.showHelp).toBe(true);
  });

  it('detects connect subcommand', async () => {
    process.argv = ['node', 'index.js', 'connect', '--api-key', 'sk_test_123'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.command).toBe('connect');
    expect(config.apiKey).toBe('sk_test_123');
  });

  it('detects --version flag', async () => {
    process.argv = ['node', 'index.js', '--version'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.showVersion).toBe(true);
  });

  it('strips trailing slash from API URL', async () => {
    process.argv = ['node', 'index.js', '--api-key', 'sk_test', '--api-url', 'https://api.example.com/'];
    const { parseConfig } = await import('../src/config.js');
    const config = parseConfig();
    expect(config.apiUrl).toBe('https://api.example.com');
  });
});

describe('Connection check', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns status payload for a reachable authenticated API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            data: { epics: 1, stories: 2 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const { checkConnection } = await import('../src/connect.js');
    const result = await checkConnection('https://api.aicodingguy.com', 'sk_test');

    expect(result.apiUrl).toBe('https://api.aicodingguy.com');
    expect(result.summary).toEqual({ epics: 1, stories: 2 });
  });

  it('throws a readable error when the API rejects the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            errors: ['Invalid API key'],
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const { checkConnection } = await import('../src/connect.js');
    await expect(checkConnection('https://api.aicodingguy.com', 'sk_test')).rejects.toThrow(
      'Connection check failed: Invalid API key',
    );
  });
});

// ---- Tool Registry Tests ----

describe('Tool Registry', () => {
  const ATTACHMENT_TOOL_NAMES = [
    'scope_upload_attachment',
    'scope_create_attachment_upload_url',
    'scope_confirm_attachment_upload',
    'scope_list_attachments',
    'scope_get_attachment_url',
    'scope_delete_attachment',
  ] as const;

  it('exports a complete tool registry', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    expect(TOOL_REGISTRY).toBeDefined();
    expect(Object.keys(TOOL_REGISTRY).length).toBeGreaterThan(20);
  });

  it('all write tools use POST or PUT methods', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const writeTools = [
      'scope_add_epic',
      'scope_add_story',
      'scope_add_subtask',
      'scope_add_decision',
      'scope_add_comment',
      'scope_add_parking_lot_item',
      'scope_add_review',
      'scope_request_review',
      'scope_batch',
    ];
    for (const toolName of writeTools) {
      const entry = TOOL_REGISTRY[toolName];
      expect(entry, `Missing registry entry for ${toolName}`).toBeDefined();
      expect(['POST', 'PUT']).toContain(entry.method);
    }
  });

  it('all update tools use PUT method', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const updateTools = [
      'scope_update_epic',
      'scope_update_story',
      'scope_update_subtask',
      'scope_update_parking_lot_item',
      'scope_resolve_review',
    ];
    for (const toolName of updateTools) {
      const entry = TOOL_REGISTRY[toolName];
      expect(entry, `Missing registry entry for ${toolName}`).toBeDefined();
      expect(entry.method).toBe('PUT');
    }
  });

  it('all read tools use GET method', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const readTools = [
      'scope_status',
      'scope_query',
      'scope_validate',
      'scope_sort',
      'scope_export_json',
      'scope_export_csv',
      'scope_export_markdown',
      'scope_graph',
      'scope_what_next',
      'scope_session_summary',
      'scope_events',
      'scope_get_reviews',
    ];
    for (const toolName of readTools) {
      const entry = TOOL_REGISTRY[toolName];
      expect(entry, `Missing registry entry for ${toolName}`).toBeDefined();
      expect(entry.method).toBe('GET');
    }
  });

  it('all entries have valid path starting with /api/', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    for (const [name, entry] of Object.entries(TOOL_REGISTRY)) {
      expect(entry.path, `Tool ${name} path should start with /api/`).toMatch(/^\/api\//);
    }
  });

  it('entries with path params have paramMapping', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    for (const [name, entry] of Object.entries(TOOL_REGISTRY)) {
      if (entry.path.includes(':')) {
        expect(
          entry.paramMapping,
          `Tool ${name} has path params but no paramMapping`,
        ).toBeDefined();
        // Each :param in path should have a corresponding mapping
        const pathParams = entry.path.match(/:([a-zA-Z_]+)/g) || [];
        for (const pathParam of pathParams) {
          const paramName = pathParam.slice(1);
          const hasMapping = Object.values(entry.paramMapping!).includes(paramName) ||
            Object.keys(entry.paramMapping!).some(k => entry.paramMapping![k] === paramName);
          expect(hasMapping, `Tool ${name}: missing paramMapping for :${paramName}`).toBe(true);
        }
      }
    }
  });

  it('scope_add_dependency maps correctly', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const entry = TOOL_REGISTRY['scope_add_dependency'];
    expect(entry).toBeDefined();
    expect(entry.method).toBe('POST');
    expect(entry.path).toBe('/api/stories/:id/dependencies');
    expect(entry.paramMapping).toEqual({ story_id: 'id' });
  });

  it('scope_remove_dependency maps correctly', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const entry = TOOL_REGISTRY['scope_remove_dependency'];
    expect(entry).toBeDefined();
    expect(entry.method).toBe('DELETE');
    expect(entry.path).toBe('/api/stories/:id/dependencies/:depId');
    expect(entry.paramMapping).toEqual({ story_id: 'id', depends_on_id: 'depId' });
  });

  it('scope_promote_parking_lot_item maps correctly', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const entry = TOOL_REGISTRY['scope_promote_parking_lot_item'];
    expect(entry).toBeDefined();
    expect(entry.method).toBe('POST');
    expect(entry.path).toBe('/api/parking-lot/:id/promote');
    expect(entry.paramMapping).toEqual({ id: 'id' });
  });

  it('contains every generated MCP tool definition', async () => {
    const { TOOL_REGISTRY } = await import('../src/tool-registry.js');
    const { TOOL_DEFINITIONS } = await import('../src/tool-definitions.generated.js');
    for (const def of TOOL_DEFINITIONS) {
      expect(TOOL_REGISTRY[def.name], `Missing registry entry for ${def.name}`).toBeDefined();
    }
  });

  it('generated definitions and proxy registry expose scope_get_comments', async () => {
    const { TOOL_REGISTRY, buildRequest } = await import('../src/tool-registry.js');
    const { TOOL_DEFINITIONS } = await import('../src/tool-definitions.generated.js');

    const definition = TOOL_DEFINITIONS.find((def) => def.name === 'scope_get_comments');
    expect(definition).toBeDefined();

    const entry = TOOL_REGISTRY['scope_get_comments'];
    expect(entry).toBeDefined();
    expect(entry.method).toBe('POST');
    expect(entry.path).toBe('/api/mcp/call');

    const built = buildRequest(
      'scope_get_comments',
      { entity_type: 'story', entity_id: 'US001', limit: 10 },
      'https://api.aicodingguy.com',
    );
    expect(built.method).toBe('POST');
    expect(built.url).toBe('https://api.aicodingguy.com/api/mcp/call');
    expect(built.body).toEqual({
      name: 'scope_get_comments',
      arguments: { entity_type: 'story', entity_id: 'US001', limit: 10 },
    });
  });

  it('scope_update_story definition should include in_review status', async () => {
    const { TOOL_DEFINITIONS } = await import('../src/tool-definitions.generated.js');
    const updateStory = TOOL_DEFINITIONS.find((def) => def.name === 'scope_update_story');
    expect(updateStory).toBeDefined();

    const status = (updateStory?.inputSchema?.properties as Record<string, unknown>)?.status as
      | { enum?: string[] }
      | undefined;
    expect(status?.enum).toContain('in_review');
  });

  it('uses MCP call fallback for tools without explicit REST route', async () => {
    const { TOOL_REGISTRY, buildRequest } = await import('../src/tool-registry.js');
    const entry = TOOL_REGISTRY['scope_list_users'];
    expect(entry).toBeDefined();
    expect(entry.method).toBe('POST');
    expect(entry.path).toBe('/api/mcp/call');

    const built = buildRequest(
      'scope_list_users',
      { role: 'admin', search: 'alice' },
      'https://api.aicodingguy.com',
    );

    expect(built.method).toBe('POST');
    expect(built.url).toBe('https://api.aicodingguy.com/api/mcp/call');
    expect(built.body).toEqual({
      name: 'scope_list_users',
      arguments: { role: 'admin', search: 'alice' },
    });
  });

  it('routes all attachment tools through the generic MCP dispatch endpoint', async () => {
    const { TOOL_REGISTRY, buildRequest } = await import('../src/tool-registry.js');
    for (const toolName of ATTACHMENT_TOOL_NAMES) {
      const entry = TOOL_REGISTRY[toolName];
      expect(entry, `Missing registry entry for ${toolName}`).toBeDefined();
      expect(entry.method).toBe('POST');
      expect(entry.path).toBe('/api/mcp/call');

      const built = buildRequest(toolName, { probe: true }, 'https://api.aicodingguy.com');
      expect(built.method).toBe('POST');
      expect(built.url).toBe('https://api.aicodingguy.com/api/mcp/call');
      expect(built.body).toEqual({
        name: toolName,
        arguments: { probe: true },
      });
    }
  });
});

// ---- Request Builder Tests ----

describe('Request Builder', () => {
  it('builds a GET request with no params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method, body } = buildRequest('scope_status', {}, 'https://api.aicodingguy.com');
    expect(method).toBe('GET');
    expect(url).toBe('https://api.aicodingguy.com/api/status');
    expect(body).toBeUndefined();
  });

  it('builds a GET request with query params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method, body } = buildRequest(
      'scope_query',
      { status: 'in_progress', component: 'core' },
      'https://api.aicodingguy.com',
    );
    expect(method).toBe('GET');
    expect(url).toContain('/api/stories');
    expect(url).toContain('status=in_progress');
    expect(url).toContain('component=core');
    expect(body).toBeUndefined();
  });

  it('builds a POST request with body params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const params = { title: 'Test Epic', priority: 'high', business_value: 'Testing' };
    const { url, method, body } = buildRequest('scope_add_epic', params, 'https://api.aicodingguy.com');
    expect(method).toBe('POST');
    expect(url).toBe('https://api.aicodingguy.com/api/epics');
    expect(body).toEqual(params);
  });

  it('builds a PUT request substituting path params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const params = { id: 'E001', title: 'Updated Title' };
    const { url, method, body } = buildRequest('scope_update_epic', params, 'https://api.aicodingguy.com');
    expect(method).toBe('PUT');
    expect(url).toBe('https://api.aicodingguy.com/api/epics/E001');
    // id should be consumed by path param, not in body
    expect(body).toEqual({ title: 'Updated Title' });
  });

  it('builds a POST request for dependencies with path params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const params = { story_id: 'US001', depends_on_id: 'US002' };
    const { url, method, body } = buildRequest('scope_add_dependency', params, 'https://api.aicodingguy.com');
    expect(method).toBe('POST');
    expect(url).toBe('https://api.aicodingguy.com/api/stories/US001/dependencies');
    expect(body).toEqual({ depends_on_id: 'US002' });
  });

  it('builds a DELETE request for dependencies with path params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const params = { story_id: 'US001', depends_on_id: 'US002' };
    const { url, method, body } = buildRequest('scope_remove_dependency', params, 'https://api.aicodingguy.com');
    expect(method).toBe('DELETE');
    expect(url).toBe('https://api.aicodingguy.com/api/stories/US001/dependencies/US002');
    expect(body).toBeUndefined();
  });

  it('throws error for unknown tool', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    expect(() => buildRequest('scope_nonexistent', {}, 'https://api.aicodingguy.com')).toThrow(/Unknown tool/);
  });

  it('builds GET request with nested filter object as query params', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const params = { filter: { epic_id: 'E001', status: 'defined' }, format: 'full' };
    const { url } = buildRequest('scope_query', params, 'https://api.aicodingguy.com');
    expect(url).toContain('epic_id=E001');
    expect(url).toContain('status=defined');
    expect(url).toContain('format=full');
  });

  it('builds GET request for session summary with limit', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method } = buildRequest('scope_session_summary', { limit: 10 }, 'https://api.aicodingguy.com');
    expect(method).toBe('GET');
    expect(url).toContain('limit=10');
  });

  it('builds GET request for events with multiple filters', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method } = buildRequest(
      'scope_events',
      { entity_type: 'story', entity_id: 'US001', limit: 20 },
      'https://api.aicodingguy.com',
    );
    expect(method).toBe('GET');
    expect(url).toContain('entity_type=story');
    expect(url).toContain('entity_id=US001');
    expect(url).toContain('limit=20');
  });

  it('builds POST request for sprint planning with body', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method, body } = buildRequest(
      'scope_plan_sprints',
      { capacity: 30 },
      'https://api.aicodingguy.com',
    );
    expect(method).toBe('POST');
    expect(url).toBe('https://api.aicodingguy.com/api/sprints');
    expect(body).toEqual({ capacity: 30 });
  });

  it('builds POST request for execution plan', async () => {
    const { buildRequest } = await import('../src/tool-registry.js');
    const { url, method, body } = buildRequest(
      'scope_plan_execution',
      { story_id: 'US001' },
      'https://api.aicodingguy.com',
    );
    expect(method).toBe('POST');
    expect(url).toBe('https://api.aicodingguy.com/api/analytics/plan-execution');
    expect(body).toEqual({ story_id: 'US001' });
  });
});

// ---- API Caller / Error Handling Tests ----

describe('API Caller', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns data on successful 200 response', async () => {
    const mockData = { ok: true, data: { id: 'E001', title: 'Test' } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');
    expect(result).toEqual(mockData);
  });

  it('sends Authorization bearer header with the API key', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    });

    const { callApi } = await import('../src/tool-registry.js');
    await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test_key');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_key',
          'X-API-Key': 'sk_test_key',
        }),
      }),
    );
  });

  it('returns MCP error for 401 unauthorized', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_bad');
    expect(result).toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Authentication failed'),
        }),
      ]),
    });
  });

  it('returns MCP error for 500 server error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' }),
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');
    expect(result).toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Server error'),
        }),
      ]),
    });
  });

  it('retries on 429 rate limit with exponential backoff', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Map([['retry-after', '1']]),
          json: () => Promise.resolve({ error: 'Rate limited' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: 'success' }),
      });
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');
    expect(result).toEqual({ ok: true, data: 'success' });
    expect(callCount).toBe(3);
  });

  it('gives up after max retries on 429', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Map([['retry-after', '1']]),
      json: () => Promise.resolve({ error: 'Rate limited' }),
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');
    expect(result).toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Rate limited'),
        }),
      ]),
    });
    // Initial call + 3 retries = 4 total calls
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');
    expect(result).toMatchObject({
      isError: true,
      content: expect.arrayContaining([
        expect.objectContaining({
          type: 'text',
          text: expect.stringContaining('Network error'),
        }),
      ]),
    });
  });

  it('retries transient network errors with exponential backoff before succeeding', async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 4) {
        return Promise.reject(new Error('ECONNREFUSED'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true, data: 'recovered' }),
      });
    });

    const { callApi } = await import('../src/tool-registry.js');
    const result = await callApi('scope_status', {}, 'https://api.aicodingguy.com', 'sk_test');

    expect(result).toEqual({ ok: true, data: 'recovered' });
    expect(callCount).toBe(4);
  });

  it('sends correct Content-Type header for POST requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ ok: true, data: { id: 'E001' } }),
    });

    const { callApi } = await import('../src/tool-registry.js');
    await callApi('scope_add_epic', { title: 'Test', priority: 'high', business_value: 'test' }, 'https://api.aicodingguy.com', 'sk_test');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('lists MCP resources via /api/mcp/resources', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        data: {
          resources: [{ uri: 'scope://guide', name: 'Scope Guide', description: 'Guide', mimeType: 'text/plain' }],
        },
      }),
    });

    const { listResourcesFromApi } = await import('../src/tool-registry.js');
    const result = await listResourcesFromApi('https://api.aicodingguy.com', 'sk_test');

    expect(result).toEqual({
      ok: true,
      data: {
        resources: [{ uri: 'scope://guide', name: 'Scope Guide', description: 'Guide', mimeType: 'text/plain' }],
      },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.aicodingguy.com/api/mcp/resources',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-Key': 'sk_test',
        }),
      }),
    );
  });

  it('reads MCP resources via /api/mcp/resources/read', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        data: {
          contents: [{ uri: 'scope://guide', mimeType: 'text/plain', text: '# Guide' }],
        },
      }),
    });

    const { readResourceFromApi } = await import('../src/tool-registry.js');
    const result = await readResourceFromApi('scope://guide', 'https://api.aicodingguy.com', 'sk_test');

    expect(result).toEqual({
      ok: true,
      data: {
        contents: [{ uri: 'scope://guide', mimeType: 'text/plain', text: '# Guide' }],
      },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.aicodingguy.com/api/mcp/resources/read?uri=scope%3A%2F%2Fguide',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-Key': 'sk_test',
        }),
      }),
    );
  });

  it('lists MCP prompts via /api/mcp/prompts', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        data: {
          prompts: [{ name: 'start-session', description: 'Start session', arguments: [] }],
        },
      }),
    });

    const { listPromptsFromApi, normalizeListPromptsResponse } = await import('../src/tool-registry.js');
    const raw = await listPromptsFromApi('https://api.aicodingguy.com', 'sk_test');
    const normalized = normalizeListPromptsResponse(raw);

    expect(normalized.prompts[0].name).toBe('start-session');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.aicodingguy.com/api/mcp/prompts',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-Key': 'sk_test',
        }),
      }),
    );
  });

  it('gets MCP prompts via /api/mcp/prompts/get', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        ok: true,
        data: {
          description: 'Start session',
          messages: [{ role: 'user', content: { type: 'text', text: 'hello' } }],
        },
      }),
    });

    const { getPromptFromApi, normalizeGetPromptResponse } = await import('../src/tool-registry.js');
    const raw = await getPromptFromApi('start-session', { project_name: 'ScopePM' }, 'https://api.aicodingguy.com', 'sk_test');
    const normalized = normalizeGetPromptResponse(raw);

    expect(normalized.messages[0].content.text).toBe('hello');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.aicodingguy.com/api/mcp/prompts/get',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'start-session', arguments: { project_name: 'ScopePM' } }),
      }),
    );
  });
});

// ---- MCP Response Formatting Tests ----

describe('MCP Response Formatting', () => {
  it('formats successful API response as MCP content', async () => {
    const { formatMcpResponse } = await import('../src/tool-registry.js');
    const apiResult = { ok: true, data: { id: 'E001', title: 'Test' } };
    const mcpResponse = formatMcpResponse(apiResult);
    expect(mcpResponse).toEqual({
      content: [{ type: 'text', text: JSON.stringify(apiResult, null, 2) }],
    });
  });

  it('formats error response with isError flag', async () => {
    const { formatMcpResponse } = await import('../src/tool-registry.js');
    const errorResult = { isError: true, content: [{ type: 'text', text: 'Something went wrong' }] };
    const mcpResponse = formatMcpResponse(errorResult);
    expect(mcpResponse).toEqual(errorResult);
  });

  it('formats string response as text content', async () => {
    const { formatMcpResponse } = await import('../src/tool-registry.js');
    const mcpResponse = formatMcpResponse('plain text result');
    expect(mcpResponse).toEqual({
      content: [{ type: 'text', text: '"plain text result"' }],
    });
  });
});

// ---- Integration: Tool Input Schema Completeness ----

describe('Tool Schema Completeness', () => {
  it('all registered tools have inputSchema', async () => {
    const { getToolDefinitions } = await import('../src/tool-registry.js');
    const defs = getToolDefinitions();
    for (const def of defs) {
      expect(def.inputSchema, `Tool ${def.name} missing inputSchema`).toBeDefined();
      expect(def.inputSchema.type).toBe('object');
    }
  });

  it('all registered tools have a description', async () => {
    const { getToolDefinitions } = await import('../src/tool-registry.js');
    const defs = getToolDefinitions();
    for (const def of defs) {
      expect(def.description, `Tool ${def.name} missing description`).toBeDefined();
      expect(def.description.length).toBeGreaterThan(10);
    }
  });
});
