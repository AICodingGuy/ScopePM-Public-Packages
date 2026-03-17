import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerSessionSummaryCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('session-summary')
    .description('Show recent activity for session context recovery')
    .option('--limit <n>', 'Max recent comments (default: 20)', '20')
    .action(async (options: { limit?: string }) => {
      try {
        const response = await client.get('/api/analytics/session-summary', {
          limit: options.limit ?? '20',
        });
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to load session summary');
          process.exitCode = 1;
          return;
        }
        formatter.output(response.data);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
