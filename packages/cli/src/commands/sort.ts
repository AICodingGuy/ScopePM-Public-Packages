import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerSortCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('sort')
    .description('Show topologically sorted stories')
    .action(async () => {
      try {
        const response = await client.get('/api/sort');
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to sort stories');
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
