import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerAddEpicCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('add-epic')
    .description('Create a new epic')
    .requiredOption('--title <title>', 'Epic title')
    .option('--description <desc>', 'Epic description (Markdown supported)')
    .option('--priority <pri>', 'Priority: critical|high|medium|low', 'medium')
    .option('--business-value <val>', 'Business value description')
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          title: options.title,
          priority: options.priority,
        };
        if (options.description) body.description = options.description;
        if (options.businessValue) body.business_value = options.businessValue;

        const response = await client.post('/api/epics', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to create epic');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => formatter.formatResult(data, 'Epic'));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
