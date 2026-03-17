import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerAddDecisionCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('add-decision')
    .description('Create a new Architecture Decision Record (ADR)')
    .requiredOption('--title <title>', 'Decision title')
    .requiredOption('--context <ctx>', 'Context (Markdown supported)')
    .requiredOption('--decision <dec>', 'Decision (Markdown supported)')
    .option('--consequences <cons>', 'Consequences (Markdown supported)')
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          title: options.title,
          context: options.context,
          decision: options.decision,
        };
        if (options.consequences) body.consequences = options.consequences;

        const response = await client.post('/api/decisions', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to create decision');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => formatter.formatResult(data, 'Decision'));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
