import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerAddCommentCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('add-comment')
    .description('Add a comment to an epic, story, or subtask')
    .requiredOption('--entity-type <type>', 'Entity type: epic|story|subtask')
    .requiredOption('--entity-id <id>', 'Entity ID (e.g. E001, US001, ST001)')
    .requiredOption('--content <text>', 'Comment content (Markdown supported)')
    .option('--author <name>', 'Author name', 'cli')
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          entity_type: options.entityType,
          entity_id: options.entityId,
          content: options.content,
          author: options.author,
        };

        const response = await client.post('/api/comments', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to add comment');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => {
          const d = data as { id?: string };
          return `Comment ${d.id ?? ''} added to ${options.entityType} ${options.entityId}`;
        });
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
