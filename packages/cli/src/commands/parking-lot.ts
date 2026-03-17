import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerParkingLotCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  const parkingLot = program
    .command('parking-lot')
    .description('Manage parking lot items');

  parkingLot
    .command('list')
    .description('List parking lot items')
    .option('--category <cat>', 'Filter by category: idea|deferred|out_of_scope|tech_debt')
    .action(async (options) => {
      try {
        const params: Record<string, string | undefined> = {};
        if (options.category) params.category = options.category;

        const response = await client.get('/api/parking-lot', params);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to list parking lot items');
          process.exitCode = 1;
          return;
        }

        const items = response.data as unknown[];
        formatter.output(response.data, () => formatter.formatParkingLot(items));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  parkingLot
    .command('add')
    .description('Add a parking lot item')
    .requiredOption('--title <title>', 'Item title')
    .requiredOption('--category <cat>', 'Category: idea|deferred|out_of_scope|tech_debt')
    .option('--priority <pri>', 'Priority: critical|high|medium|low', 'medium')
    .option('--description <desc>', 'Description')
    .option('--rationale <text>', 'Rationale for adding to parking lot')
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          title: options.title,
          category: options.category,
          priority: options.priority,
        };
        if (options.description) body.description = options.description;
        if (options.rationale) body.rationale = options.rationale;

        const response = await client.post('/api/parking-lot', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to add parking lot item');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => formatter.formatResult(data, 'Parking lot item'));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
