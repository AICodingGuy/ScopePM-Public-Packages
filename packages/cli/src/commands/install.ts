import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import { resolveApiKey, resolveApiUrl } from '../config.js';

export type InstallTarget = 'project' | 'claude' | 'cursor' | 'gemini' | 'chatgpt' | 'all';

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpConfigFile {
  mcpServers: Record<string, McpServerConfig>;
  [key: string]: unknown;
}

interface WriteMcpConfigResult {
  path: string;
  created: boolean;
  updated: boolean;
}

interface PathResolveOptions {
  cwd?: string;
  homeDir?: string;
  platform?: NodeJS.Platform;
  appData?: string;
}

interface InstallCommandOptions {
  target?: string;
  configPath?: string;
  serverName?: string;
  apiUrl?: string;
  apiKey?: string;
  dryRun?: boolean;
}

const DEFAULT_MCP_PACKAGE_SPEC = '@scope-pm/mcp@0.1.6';

export function isInstallTarget(value: string): value is Exclude<InstallTarget, 'all'> {
  return value === 'project' || value === 'claude' || value === 'cursor' || value === 'gemini' || value === 'chatgpt';
}

function normalizeApiUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function defaultConfigPathForTarget(
  target: Exclude<InstallTarget, 'all'>,
  options: PathResolveOptions = {},
): string {
  const homeDir = options.homeDir ?? os.homedir();
  const cwd = options.cwd ?? process.cwd();
  const platform = options.platform ?? process.platform;

  switch (target) {
    case 'project':
      return path.resolve(cwd, '.mcp.json');
    case 'claude':
      return path.join(homeDir, '.claude', '.mcp.json');
    case 'cursor':
      return path.join(homeDir, '.cursor', 'mcp.json');
    case 'gemini':
      return path.join(homeDir, '.gemini', 'settings.json');
    case 'chatgpt':
      if (platform === 'darwin') {
        return path.join(homeDir, 'Library', 'Application Support', 'ChatGPT', 'mcp.json');
      }
      if (platform === 'win32') {
        const appData = options.appData ?? process.env.APPDATA ?? path.join(homeDir, 'AppData', 'Roaming');
        return path.join(appData, 'ChatGPT', 'mcp.json');
      }
      return path.join(homeDir, '.config', 'chatgpt', 'mcp.json');
  }
}

export function resolveInstallPaths(
  target: InstallTarget,
  explicitPath?: string,
  options: PathResolveOptions = {},
): string[] {
  if (explicitPath) {
    const cwd = options.cwd ?? process.cwd();
    return [path.resolve(cwd, explicitPath)];
  }

  if (target === 'all') {
    return [
      defaultConfigPathForTarget('project', options),
      defaultConfigPathForTarget('claude', options),
      defaultConfigPathForTarget('cursor', options),
      defaultConfigPathForTarget('gemini', options),
      defaultConfigPathForTarget('chatgpt', options),
    ];
  }

  return [defaultConfigPathForTarget(target, options)];
}

export function buildRemoteMcpServerConfig(apiUrl: string, apiKey?: string): McpServerConfig {
  const normalizedApiUrl = normalizeApiUrl(apiUrl);
  return {
    command: 'npx',
    args: [DEFAULT_MCP_PACKAGE_SPEC, '--api-url', normalizedApiUrl],
    env: apiKey?.trim() ? { SCOPE_API_KEY: apiKey.trim() } : undefined,
  };
}

function parseMcpConfig(raw: string): McpConfigFile {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('MCP config root must be a JSON object');
  }
  const obj = parsed as Record<string, unknown>;
  const servers = obj.mcpServers;
  if (servers !== undefined && (typeof servers !== 'object' || servers === null || Array.isArray(servers))) {
    throw new Error('mcpServers must be a JSON object');
  }

  return {
    ...obj,
    mcpServers: (servers as Record<string, McpServerConfig> | undefined) ?? {},
  };
}

function mergeMcpServer(config: McpConfigFile, serverName: string, serverConfig: McpServerConfig): McpConfigFile {
  return {
    ...config,
    mcpServers: {
      ...config.mcpServers,
      [serverName]: serverConfig,
    },
  };
}

export function writeMergedMcpConfig(input: {
  configPath: string;
  serverName: string;
  serverConfig: McpServerConfig;
  dryRun?: boolean;
}): WriteMcpConfigResult {
  const normalizedPath = path.resolve(input.configPath);
  const created = !fs.existsSync(normalizedPath);

  const existing = created ? ({ mcpServers: {} } as McpConfigFile) : parseMcpConfig(fs.readFileSync(normalizedPath, 'utf-8'));
  const merged = mergeMcpServer(existing, input.serverName, input.serverConfig);

  if (!input.dryRun) {
    fs.mkdirSync(path.dirname(normalizedPath), { recursive: true });
    fs.writeFileSync(normalizedPath, `${JSON.stringify(merged, null, 2)}\n`);
  }

  return {
    path: normalizedPath,
    created,
    updated: !created,
  };
}

function writeError(jsonMode: boolean, message: string): void {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify({ ok: false, errors: [message] })}\n`);
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  process.exitCode = 1;
}

export function registerInstallCommand(program: Command): void {
  program
    .command('install')
    .description('Install ScopePM config for project or desktop clients (remote API)')
    .option('--target <target>', 'Target: project|claude|cursor|gemini|chatgpt|all', 'claude')
    .option('--config-path <path>', 'Explicit config file path (single target only)')
    .option('--server-name <name>', 'MCP server name in config', 'scopepm')
    .option('--api-url <url>', 'Remote API URL override')
    .option('--api-key <key>', 'API key override (otherwise from env/config)')
    .option('--dry-run', 'Preview changes without writing files')
    .action((options: InstallCommandOptions, cmd: Command) => {
      const globalOpts = cmd.optsWithGlobals?.() as { json?: boolean; apiUrl?: string; apiKey?: string };
      const jsonMode = globalOpts?.json === true;
      const targetRaw = (options.target ?? 'claude').trim().toLowerCase();
      const target: InstallTarget = targetRaw === 'all' ? 'all' : (targetRaw as InstallTarget);

      if (!(target === 'all' || isInstallTarget(target))) {
        writeError(jsonMode, `Invalid --target '${targetRaw}'. Use: project|claude|cursor|gemini|chatgpt|all`);
        return;
      }

      if (target === 'all' && options.configPath) {
        writeError(jsonMode, '--config-path cannot be used together with --target all');
        return;
      }

      const serverName = (options.serverName ?? 'scopepm').trim();
      if (!serverName) {
        writeError(jsonMode, '--server-name must not be empty');
        return;
      }

      const apiUrl = resolveApiUrl(options.apiUrl ?? globalOpts?.apiUrl);
      const apiKey = resolveApiKey(options.apiKey ?? globalOpts?.apiKey);
      const serverConfig = buildRemoteMcpServerConfig(apiUrl, apiKey);
      const configPaths = resolveInstallPaths(target, options.configPath);

      const writes: WriteMcpConfigResult[] = [];
      try {
        for (const configPath of configPaths) {
          writes.push(
            writeMergedMcpConfig({
              configPath,
              serverName,
              serverConfig,
              dryRun: options.dryRun === true,
            }),
          );
        }
      } catch (error) {
        writeError(jsonMode, error instanceof Error ? error.message : 'Unknown error');
        return;
      }

      const warnings: string[] = [];
      if (!apiKey) {
        warnings.push('No API key stored in MCP config. Set SCOPE_API_KEY in your MCP client env or rerun with --api-key.');
      }
      if (target === 'gemini' && !options.configPath) {
        warnings.push('Gemini CLI settings.json may contain other settings. Only the mcpServers key is modified.');
      }
      if (target === 'chatgpt' && !options.configPath) {
        warnings.push('ChatGPT Desktop config path can vary by OS/build. Use --config-path if needed.');
      }

      const payload = {
        ok: true,
        data: {
          target,
          server_name: serverName,
          api_url: normalizeApiUrl(apiUrl),
          dry_run: options.dryRun === true,
          writes,
          mcp_server: serverConfig,
        },
        warnings,
      };

      if (jsonMode) {
        process.stdout.write(`${JSON.stringify(payload)}\n`);
        return;
      }

      const headline = options.dryRun ? 'ScopePM install preview (no files written):' : 'ScopePM install complete:';
      process.stdout.write(`${headline}\n`);
      for (const write of writes) {
        process.stdout.write(`  ${write.created ? 'created' : 'updated'}: ${write.path}\n`);
      }
      process.stdout.write(`  server: ${serverName}\n`);
      process.stdout.write(`  api-url: ${normalizeApiUrl(apiUrl)}\n`);

      if (warnings.length > 0) {
        process.stdout.write('\nWarnings:\n');
        for (const warning of warnings) {
          process.stdout.write(`  - ${warning}\n`);
        }
      }

      process.stdout.write('\nNext steps:\n');
      process.stdout.write('  1) Restart your MCP client (Claude/Cursor/ChatGPT).\n');
      process.stdout.write('  2) Verify with: scope status\n');
    });
}
