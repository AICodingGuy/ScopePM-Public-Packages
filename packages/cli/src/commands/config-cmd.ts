import type { Command } from 'commander';
import { loadConfig, setConfigValue, getConfigValue, CONFIG_FILE } from '../config.js';

export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command('config')
    .description('Manage CLI configuration');

  configCmd
    .command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Config key: api-key | api-url')
    .argument('<value>', 'Value to set')
    .action((key: string, value: string) => {
      try {
        setConfigValue(key, value);
        // Mask API keys in output
        const displayValue = (key === 'api-key' || key === 'api_key')
          ? maskApiKey(value)
          : value;
        process.stdout.write(`Set ${key} = ${displayValue}\n`);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        process.exitCode = 1;
      }
    });

  configCmd
    .command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Config key: api-key | api-url')
    .action((key: string) => {
      try {
        const value = getConfigValue(key);
        if (value === undefined) {
          process.stdout.write(`${key}: (not set)\n`);
        } else {
          // Mask API keys in output
          const displayValue = (key === 'api-key' || key === 'api_key')
            ? maskApiKey(value)
            : value;
          process.stdout.write(`${key}: ${displayValue}\n`);
        }
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        process.exitCode = 1;
      }
    });

  configCmd
    .command('list')
    .description('List all configuration values')
    .action(() => {
      const config = loadConfig();
      process.stdout.write(`Config file: ${CONFIG_FILE}\n`);
      process.stdout.write(`api-url: ${config.api_url}\n`);
      process.stdout.write(`api-key: ${config.api_key ? maskApiKey(config.api_key) : '(not set)'}\n`);
    });
}

/**
 * Mask an API key for display, showing only the first 7 characters.
 * Example: "sk_live_abc123xyz" -> "sk_live..."
 */
function maskApiKey(key: string): string {
  if (key.length <= 7) return '***';
  return key.substring(0, 7) + '...';
}
