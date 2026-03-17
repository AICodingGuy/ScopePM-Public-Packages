import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerQueryCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('query')
    .description('Query stories with filters')
    .option('--status <status>', 'Filter by status: defined|in_progress|done')
    .option('--priority <priorities>', 'Filter by priority (comma-separated): critical,high,medium,low')
    .option('--epic <epicId>', 'Filter by epic ID')
    .option('--component <comp>', 'Filter by component')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--search <term>', 'Case-insensitive title search')
    .option('--limit <n>', 'Max stories to return')
    .option('--offset <n>', 'Skip first N stories (pagination)', '0')
    .action(async (options) => {
      try {
        const params: Record<string, string | undefined> = {};
        if (options.status) params.status = options.status;
        if (options.priority) params.priority = options.priority;
        if (options.epic) params.epic_id = options.epic;
        if (options.component) params.component = options.component;
        if (options.tags) params.tags = options.tags;
        if (options.search) params.search = options.search;
        if (options.limit) params.limit = options.limit;
        if (options.offset && options.offset !== '0') params.offset = options.offset;

        const response = await client.get('/api/stories', params);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to query stories');
          process.exitCode = 1;
          return;
        }

        const stories = response.data as unknown[];
        formatter.output(response.data, () => formatter.formatStories(stories));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
