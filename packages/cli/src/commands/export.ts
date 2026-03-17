import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerExportCommands(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('export-json')
    .description('Export full scope as JSON snapshot')
    .action(async () => {
      try {
        const response = await client.get('/api/export/json');
        // Export JSON endpoint returns the data directly, not wrapped in {ok, data}
        process.stdout.write(JSON.stringify(response.data ?? response, null, 2) + '\n');
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  program
    .command('export-csv')
    .description('Export stories as CSV')
    .action(async () => {
      try {
        const csv = await client.getRaw('/api/export/csv');
        process.stdout.write(csv);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  program
    .command('export-md')
    .description('Export complete scope as Markdown document')
    .action(async () => {
      try {
        const markdown = await client.getRaw('/api/export/markdown');
        process.stdout.write(markdown);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  program
    .command('export-md-files')
    .description('Export scope as separate Markdown files per epic')
    .action(async () => {
      try {
        const response = await client.get('/api/export/markdown-files');
        formatter.output(response.data ?? response);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });

  program
    .command('export-pdf')
    .description('Export complete scope as PDF report')
    .action(async () => {
      try {
        const response = await client.get('/api/export/pdf');
        formatter.output(response.data ?? response);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
