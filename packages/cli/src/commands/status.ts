import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerStatusCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('status')
    .description('Show scope status overview')
    .action(async () => {
      try {
        const response = await client.get('/api/status');
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to get status');
          process.exitCode = 1;
          return;
        }
        if (!(program.optsWithGlobals?.().json === true)) {
          process.stdout.write(`Mode: SaaS (${client.getBaseUrl()})\n`);
        }
        formatter.output(response.data, (data) => formatter.formatStatus(data));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
