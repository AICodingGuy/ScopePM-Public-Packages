import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerUpdateStoryCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('update-story')
    .description('Update an existing story')
    .argument('<id>', 'Story ID (e.g. US001)')
    .option('--title <title>', 'New title')
    .option('--status <status>', 'New status: defined|in_progress|done')
    .option('--priority <pri>', 'New priority: critical|high|medium|low')
    .option('--story-points <sp>', 'New story points (1-21)')
    .option('--component <comp>', 'Component name')
    .option('--fix-version <ver>', 'Fix version / sprint')
    .option('--technical-notes <notes>', 'Technical notes (Markdown supported)')
    .option('--business-value <val>', 'Business value description')
    .option('--assigned-to <agent>', 'Assign to agent')
    .action(async (id: string, options) => {
      try {
        const body: Record<string, unknown> = {};
        if (options.title) body.title = options.title;
        if (options.status) body.status = options.status;
        if (options.priority) body.priority = options.priority;
        if (options.storyPoints) body.story_points = parseInt(options.storyPoints, 10);
        if (options.component !== undefined) body.component = options.component || null;
        if (options.fixVersion !== undefined) body.fix_version = options.fixVersion || null;
        if (options.technicalNotes !== undefined) body.technical_notes = options.technicalNotes || null;
        if (options.businessValue !== undefined) body.business_value = options.businessValue || null;
        if (options.assignedTo !== undefined) body.assigned_to = options.assignedTo || null;

        if (Object.keys(body).length === 0) {
          formatter.error('No fields to update. Provide at least one option.');
          process.exitCode = 1;
          return;
        }

        const response = await client.put(`/api/stories/${id}`, body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to update story');
          process.exitCode = 1;
          return;
        }

        formatter.success(`Story ${id} updated`);
        formatter.output(response.data);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
