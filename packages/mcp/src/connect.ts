export async function checkConnection(apiUrl: string, apiKey: string): Promise<{
  apiUrl: string;
  summary: unknown;
}> {
  const response = await fetch(`${apiUrl}/api/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'X-API-Key': apiKey,
      Accept: 'application/json',
      'User-Agent': '@scope-pm/mcp/0.1.0',
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; data?: unknown; errors?: string[] }
    | null;

  if (!response.ok || !payload?.ok) {
    const reason = payload?.errors?.join(', ') ?? `HTTP ${response.status}`;
    throw new Error(`Connection check failed: ${reason}`);
  }

  return {
    apiUrl,
    summary: payload.data ?? null,
  };
}
