import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerUpdateEpicCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('update-epic')
    .description('Update an existing epic')
    .argument('<id>', 'Epic ID (e.g. E001)')
    .option('--title <title>', 'New title')
    .option('--status <status>', 'New status: defined|in_progress|done')
    .option('--priority <pri>', 'New priority: critical|high|medium|low')
    .option('--description <desc>', 'Description (Markdown supported)')
    .option('--business-value <val>', 'Business value description')
    .action(async (id: string, options) => {
      try {
        const body: Record<string, unknown> = {};
        if (options.title) body.title = options.title;
        if (options.status) body.status = options.status;
        if (options.priority) body.priority = options.priority;
        if (options.description !== undefined) body.description = options.description;
        if (options.businessValue !== undefined) body.business_value = options.businessValue || null;

        if (Object.keys(body).length === 0) {
          formatter.error('No fields to update. Provide at least one option.');
          process.exitCode = 1;
          return;
        }

        const response = await client.put(`/api/epics/${id}`, body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to update epic');
          process.exitCode = 1;
          return;
        }

        formatter.success(`Epic ${id} updated`);
        formatter.output(response.data);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
