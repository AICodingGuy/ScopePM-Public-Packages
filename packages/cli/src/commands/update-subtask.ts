import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerUpdateSubtaskCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('update-subtask')
    .description('Update an existing subtask')
    .argument('<id>', 'Subtask ID (e.g. ST001)')
    .option('--title <title>', 'New title')
    .option('--type <type>', 'Type: frontend|backend|infra|test|docs|design')
    .option('--status <status>', 'New status: todo|in_progress|done')
    .option('--hours <hours>', 'New estimated hours')
    .option('--description <desc>', 'Description (Markdown supported)')
    .option('--technical-notes <notes>', 'Technical notes with ### headings (Markdown supported)')
    .action(async (id: string, options) => {
      try {
        const body: Record<string, unknown> = {};
        if (options.title) body.title = options.title;
        if (options.type) body.type = options.type;
        if (options.status) body.status = options.status;
        if (options.hours) body.estimated_hours = parseFloat(options.hours);
        if (options.description !== undefined) body.description = options.description || null;
        if (options.technicalNotes !== undefined) body.technical_notes = options.technicalNotes || null;

        if (Object.keys(body).length === 0) {
          formatter.error('No fields to update. Provide at least one option.');
          process.exitCode = 1;
          return;
        }

        const response = await client.put(`/api/subtasks/${id}`, body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to update subtask');
          process.exitCode = 1;
          return;
        }

        formatter.success(`Subtask ${id} updated`);
        formatter.output(response.data);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
