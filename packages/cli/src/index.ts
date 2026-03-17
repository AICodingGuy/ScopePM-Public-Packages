#!/usr/bin/env node

import { Command } from 'commander';
import { ApiClient } from './api-client.js';
import { Formatter } from './formatter.js';
import { resolveApiKey, resolveApiUrl } from './config.js';

import { registerStatusCommand } from './commands/status.js';
import { registerQueryCommand } from './commands/query.js';
import { registerAddEpicCommand } from './commands/add-epic.js';
import { registerUpdateEpicCommand } from './commands/update-epic.js';
import { registerAddStoryCommand } from './commands/add-story.js';
import { registerUpdateStoryCommand } from './commands/update-story.js';
import { registerAddSubtaskCommand } from './commands/add-subtask.js';
import { registerUpdateSubtaskCommand } from './commands/update-subtask.js';
import { registerAddDecisionCommand } from './commands/add-decision.js';
import { registerAddCommentCommand } from './commands/add-comment.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerSortCommand } from './commands/sort.js';
import { registerGraphCommand } from './commands/graph.js';
import { registerSessionSummaryCommand } from './commands/session-summary.js';
import { registerPlanExecutionCommand } from './commands/plan-execution.js';
import { registerExportCommands } from './commands/export.js';
import { registerParkingLotCommand } from './commands/parking-lot.js';
import { registerConfigCommand } from './commands/config-cmd.js';
import { registerInstallCommand } from './commands/install.js';

/**
 * Create the CLI program with all commands registered.
 * Exported for testing — callers can inject an ApiClient and Formatter.
 */
export function createProgram(overrides?: {
  client?: ApiClient;
  formatter?: Formatter;
}): Command {
  const program = new Command();

  program
    .name('scope')
    .description('ScopePM CLI — manage project scope via the REST API')
    .version('0.1.1')
    .option('--api-key <key>', 'API key for authentication')
    .option('--api-url <url>', 'API base URL')
    .option('--json', 'Output raw JSON instead of human-readable format');

  // Config command does not need API client — register separately
  registerConfigCommand(program);
  registerInstallCommand(program);

  // Resolve API client and formatter.
  // When overrides are provided (testing), use those.
  // Otherwise, lazily resolve from flags/env/config at command invocation time.
  const resolveClientAndFormatter = (opts: Record<string, unknown>) => {
    if (overrides?.client && overrides?.formatter) {
      return { client: overrides.client, formatter: overrides.formatter };
    }

    const apiKey = resolveApiKey(opts.apiKey as string | undefined);
    const apiUrl = resolveApiUrl(opts.apiUrl as string | undefined);
    const jsonMode = opts.json === true;

    const client = new ApiClient({ baseUrl: apiUrl, apiKey });
    const formatter = new Formatter(jsonMode);
    return { client, formatter };
  };

  // Build a default client/formatter for command registration (uses env vars / config file).
  // CLI flags (--api-key, --api-url) are applied later via preAction hook.
  const defaults = resolveClientAndFormatter(overrides ? {} : {});
  const client = overrides?.client ?? defaults.client;
  const formatter = overrides?.formatter ?? defaults.formatter;

  // After Commander parses argv, reconfigure the client with any CLI flag overrides.
  if (!overrides?.client) {
    program.hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      const flagKey = opts.apiKey as string | undefined;
      const flagUrl = opts.apiUrl as string | undefined;
      if (flagKey || flagUrl) {
        client.reconfigure({
          apiKey: flagKey,
          baseUrl: flagUrl,
        });
      }
    });
  }

  // Register all API-based commands
  registerStatusCommand(program, client, formatter);
  registerQueryCommand(program, client, formatter);
  registerAddEpicCommand(program, client, formatter);
  registerUpdateEpicCommand(program, client, formatter);
  registerAddStoryCommand(program, client, formatter);
  registerUpdateStoryCommand(program, client, formatter);
  registerAddSubtaskCommand(program, client, formatter);
  registerUpdateSubtaskCommand(program, client, formatter);
  registerAddDecisionCommand(program, client, formatter);
  registerAddCommentCommand(program, client, formatter);
  registerValidateCommand(program, client, formatter);
  registerSortCommand(program, client, formatter);
  registerGraphCommand(program, client, formatter);
  registerSessionSummaryCommand(program, client, formatter);
  registerPlanExecutionCommand(program, client, formatter);
  registerExportCommands(program, client, formatter);
  registerParkingLotCommand(program, client, formatter);

  return program;
}

// Main entry point — only runs when executed directly (not when imported for testing)
async function main(): Promise<void> {
  const program = createProgram();

  // Commander does not support async by default; we need to await parseAsync
  await program.parseAsync(process.argv);
}

// Detect if running as main module
const isDirectExecution = process.argv[1] &&
  (process.argv[1].endsWith('/scope') ||
   process.argv[1].includes('index.js') ||
   process.argv[1].includes('index.ts'));

if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`Fatal: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    process.exit(1);
  });
}

// Re-exports for programmatic use and testing
export { ApiClient, ApiClientError, type ApiClientOptions, type ApiResponse } from './api-client.js';
export { Formatter, colorStatus, colorPriority } from './formatter.js';
export {
  loadConfig,
  saveConfig,
  setConfigValue,
  getConfigValue,
  resolveApiKey,
  resolveApiUrl,
  type ScopeConfig,
} from './config.js';
