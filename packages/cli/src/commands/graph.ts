import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerGraphCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('graph')
    .description('Generate Mermaid dependency graph')
    .action(async () => {
      try {
        const response = await client.get('/api/graph');
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to generate graph');
          process.exitCode = 1;
          return;
        }

        if (formatter.isJsonMode()) {
          formatter.output(response.data);
          return;
        }

        const graph = (response.data as { graph?: string } | undefined)?.graph;
        process.stdout.write(typeof graph === 'string' ? `${graph}\n` : `${JSON.stringify(response.data, null, 2)}\n`);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
