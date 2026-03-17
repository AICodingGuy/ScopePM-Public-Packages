import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRemoteMcpServerConfig,
  defaultConfigPathForTarget,
  resolveInstallPaths,
  writeMergedMcpConfig,
} from '../src/commands/install.js';
import { createProgram } from '../src/index.js';

describe('install command helpers', () => {
  it('buildRemoteMcpServerConfig normalizes API URL and injects API key', () => {
    const config = buildRemoteMcpServerConfig('https://api.aicodingguy.com/', 'sk_test_123');
    expect(config.command).toBe('npx');
    expect(config.args).toEqual(['-y', '@scope-pm/mcp', '--transport', 'http', '--api-url', 'https://api.aicodingguy.com']);
    expect(config.env).toEqual({ SCOPE_API_KEY: 'sk_test_123' });
  });

  it('defaultConfigPathForTarget resolves platform specific chatgpt path', () => {
    const linux = defaultConfigPathForTarget('chatgpt', {
      homeDir: '/home/tester',
      platform: 'linux',
    });
    expect(linux).toBe('/home/tester/.config/chatgpt/mcp.json');

    const win = defaultConfigPathForTarget('chatgpt', {
      homeDir: 'C:\\Users\\tester',
      platform: 'win32',
      appData: 'C:\\Users\\tester\\AppData\\Roaming',
    });
    expect(win).toContain(path.join('ChatGPT', 'mcp.json'));
  });

  it('resolveInstallPaths returns all targets with overridden cwd/home', () => {
    const paths = resolveInstallPaths('all', undefined, {
      cwd: '/workspace/app',
      homeDir: '/home/tester',
      platform: 'linux',
    });
    expect(paths).toEqual([
      '/workspace/app/.mcp.json',
      '/home/tester/.claude/.mcp.json',
      '/home/tester/.cursor/mcp.json',
      '/home/tester/.gemini/settings.json',
      '/home/tester/.config/chatgpt/mcp.json',
    ]);
  });

  it('writeMergedMcpConfig preserves unrelated mcpServers entries', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-cli-install-'));
    const filePath = path.join(tempDir, 'mcp.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        mcpServers: {
          existing: { command: 'npx', args: ['existing-server'] },
        },
        metadata: { keep: true },
      }),
    );

    const result = writeMergedMcpConfig({
      configPath: filePath,
      serverName: 'scopepm',
      serverConfig: buildRemoteMcpServerConfig('https://api.aicodingguy.com', 'sk_test'),
    });

    expect(result.created).toBe(false);
    expect(result.updated).toBe(true);

    const merged = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
      metadata?: { keep?: boolean };
    };
    expect(merged.metadata?.keep).toBe(true);
    expect(merged.mcpServers.existing).toBeDefined();
    expect(merged.mcpServers['scopepm']).toBeDefined();
  });

  it('writeMergedMcpConfig dry run does not create file', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-cli-install-dry-'));
    const filePath = path.join(tempDir, 'dry-mcp.json');

    const result = writeMergedMcpConfig({
      configPath: filePath,
      serverName: 'scopepm',
      serverConfig: buildRemoteMcpServerConfig('https://api.aicodingguy.com'),
      dryRun: true,
    });

    expect(result.created).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});

describe('install command integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createProgram registers install command', () => {
    const program = createProgram();
    const commandNames = program.commands.map((c) => c.name());
    expect(commandNames).toContain('install');
  });

  it('install --dry-run --json prints deterministic payload', async () => {
    const program = createProgram();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scope-cli-install-cmd-'));
    const filePath = path.join(tempDir, 'custom-mcp.json');

    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      out.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });

    await program.parseAsync([
      'node',
      'scope',
      '--json',
      'install',
      '--config-path',
      filePath,
      '--dry-run',
      '--api-url',
      'https://api.aicodingguy.com/',
      '--api-key',
      'sk_test_987',
    ]);

    const payload = JSON.parse(out.join('').trim()) as {
      ok: boolean;
      data: { dry_run: boolean; writes: Array<{ path: string; created: boolean }> };
    };
    expect(payload.ok).toBe(true);
    expect(payload.data.dry_run).toBe(true);
    expect(payload.data.writes[0].path).toBe(path.resolve(filePath));
    expect(payload.data.writes[0].created).toBe(true);
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
