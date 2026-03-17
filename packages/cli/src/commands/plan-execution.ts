import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerPlanExecutionCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('plan-execution')
    .description('Generate a detailed execution plan for a story')
    .argument('<storyId>', 'Story ID (e.g. US001)')
    .action(async (storyId: string) => {
      try {
        const response = await client.post('/api/analytics/plan-execution', { story_id: storyId });
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to generate execution plan');
          process.exitCode = 1;
          return;
        }
        formatter.output(response.data);
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
