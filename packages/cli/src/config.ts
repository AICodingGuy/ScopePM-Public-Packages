import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ScopeConfig {
  api_key?: string;
  api_url: string;
}

const DEFAULT_API_URL = 'https://api.aicodingguy.com';
const CONFIG_DIR = path.join(os.homedir(), '.scope-pm');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Load configuration from ~/.scope-pm/config.json.
 * Returns a default config if the file does not exist or is invalid.
 */
export function loadConfig(): ScopeConfig {
  const defaults: ScopeConfig = { api_url: DEFAULT_API_URL };

  if (!fs.existsSync(CONFIG_FILE)) {
    return defaults;
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ScopeConfig>;
    return {
      api_key: parsed.api_key ?? defaults.api_key,
      api_url: parsed.api_url ?? defaults.api_url,
    };
  } catch {
    return defaults;
  }
}

/**
 * Save configuration to ~/.scope-pm/config.json.
 * Creates the directory if it does not exist.
 */
export function saveConfig(config: ScopeConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Set a single configuration key.
 */
export function setConfigValue(key: string, value: string): void {
  const config = loadConfig();
  if (key === 'api-key' || key === 'api_key') {
    config.api_key = value;
  } else if (key === 'api-url' || key === 'api_url') {
    config.api_url = value;
  } else {
    throw new Error(`Unknown config key: ${key}. Valid keys: api-key, api-url`);
  }
  saveConfig(config);
}

/**
 * Get a single configuration value.
 */
export function getConfigValue(key: string): string | undefined {
  const config = loadConfig();
  if (key === 'api-key' || key === 'api_key') {
    return config.api_key;
  } else if (key === 'api-url' || key === 'api_url') {
    return config.api_url;
  }
  throw new Error(`Unknown config key: ${key}. Valid keys: api-key, api-url`);
}

/**
 * Resolve the API key from (in priority order):
 * 1. --api-key CLI flag
 * 2. SCOPE_API_KEY environment variable
 * 3. config file (~/.scope-pm/config.json)
 */
export function resolveApiKey(flagValue?: string): string | undefined {
  if (flagValue) return flagValue;
  if (process.env.SCOPE_API_KEY) return process.env.SCOPE_API_KEY;
  return loadConfig().api_key;
}

/**
 * Resolve the API URL from (in priority order):
 * 1. --api-url CLI flag
 * 2. SCOPE_API_URL environment variable
 * 3. config file (~/.scope-pm/config.json)
 */
export function resolveApiUrl(flagValue?: string): string {
  if (flagValue) return flagValue;
  if (process.env.SCOPE_API_URL) return process.env.SCOPE_API_URL;
  return loadConfig().api_url;
}

export { CONFIG_DIR, CONFIG_FILE, DEFAULT_API_URL };
