import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerAddSubtaskCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('add-subtask')
    .description('Create a new subtask')
    .requiredOption('--story <storyId>', 'Parent story ID (e.g. US001)')
    .requiredOption('--title <title>', 'Subtask title')
    .requiredOption('--type <type>', 'Type: frontend|backend|infra|test|docs|design')
    .option('--hours <hours>', 'Estimated hours')
    .option('--description <desc>', 'Description (Markdown supported)')
    .option('--technical-notes <notes>', 'Technical notes with ### Approach, ### Key Files, ### Status')
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          story_id: options.story,
          title: options.title,
          type: options.type,
        };
        if (options.hours) body.estimated_hours = parseFloat(options.hours);
        if (options.description) body.description = options.description;
        if (options.technicalNotes) body.technical_notes = options.technicalNotes;

        const response = await client.post('/api/subtasks', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to create subtask');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => formatter.formatResult(data, 'Subtask'));
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
