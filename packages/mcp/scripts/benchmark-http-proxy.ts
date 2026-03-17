import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { callApi } from '../src/tool-registry.js';

const ITERATIONS = 50;

async function startServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, data: { healthy: true } }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, errors: ['Not found'] }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve benchmark server address');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    },
  };
}

async function measure<T>(fn: () => Promise<T>): Promise<{ avgMs: number; lastResult: T }> {
  let total = 0;
  let lastResult: T | undefined;

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    lastResult = await fn();
    total += performance.now() - start;
  }

  return {
    avgMs: total / ITERATIONS,
    lastResult: lastResult as T,
  };
}

async function main(): Promise<void> {
  const server = await startServer();
  try {
    const direct = await measure(async () => {
      const response = await fetch(`${server.url}/api/status`, {
        headers: {
          Authorization: 'Bearer sk_test_benchmark',
          'X-API-Key': 'sk_test_benchmark',
          Accept: 'application/json',
        },
      });
      return response.json();
    });

    const proxied = await measure(async () => callApi('scope_status', {}, server.url, 'sk_test_benchmark'));
    const overheadMs = proxied.avgMs - direct.avgMs;

    const payload = {
      ok: overheadMs <= 50,
      iterations: ITERATIONS,
      direct_avg_ms: Number(direct.avgMs.toFixed(3)),
      proxy_avg_ms: Number(proxied.avgMs.toFixed(3)),
      overhead_ms: Number(overheadMs.toFixed(3)),
      proxy_result: proxied.lastResult,
    };

    process.stdout.write(`${JSON.stringify(payload)}\n`);
    if (!payload.ok) {
      process.exitCode = 1;
    }
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
