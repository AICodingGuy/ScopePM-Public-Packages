import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerValidateCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('validate')
    .description('Run all validation rules')
    .action(async () => {
      try {
        const response = await client.get('/api/validate');
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to validate');
          process.exitCode = 1;
          return;
        }

        const data = response.data as {
          ok: boolean;
          findings: Array<{ rule: string; severity: string; message: string }>;
          summary: { errors: number; warnings: number; infos: number };
        };

        formatter.output(response.data, () => formatter.formatValidation(data));

        if (!data.ok) {
          process.exitCode = 1;
        }
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
