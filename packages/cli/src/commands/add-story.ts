import type { Command } from 'commander';
import type { ApiClient } from '../api-client.js';
import type { Formatter } from '../formatter.js';

export function registerAddStoryCommand(program: Command, client: ApiClient, formatter: Formatter): void {
  program
    .command('add-story')
    .description('Create a new user story')
    .requiredOption('--epic <epicId>', 'Parent epic ID (e.g. E001)')
    .requiredOption('--title <title>', 'Story title')
    .requiredOption('--as-a <role>', 'As a [role]')
    .requiredOption('--i-want <want>', 'I want [feature]')
    .requiredOption('--so-that <benefit>', 'So that [benefit]')
    .option('--priority <pri>', 'Priority: critical|high|medium|low', 'medium')
    .option('--story-points <sp>', 'Story points (Fibonacci: 1,2,3,5,8,13,21)')
    .option('--component <comp>', 'Component name (e.g. core, cli, mcp, web)')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--depends-on <ids>', 'Comma-separated dependency IDs (e.g. US001,US002)')
    .option('--fix-version <ver>', 'Fix version / sprint')
    .option('--technical-notes <notes>', 'Technical notes / solution approach (Markdown)')
    .option('--business-value <val>', 'Business value / why this story matters')
    .option(
      '--acceptance-criteria <acs>',
      'JSON array of {title, criterion} or "title:criterion" pairs separated by ||',
    )
    .action(async (options) => {
      try {
        const body: Record<string, unknown> = {
          epic_id: options.epic,
          title: options.title,
          as_a: options.asA,
          i_want: options.iWant,
          so_that: options.soThat,
          priority: options.priority,
        };

        if (options.storyPoints) body.story_points = parseInt(options.storyPoints, 10);
        if (options.component) body.component = options.component;
        if (options.fixVersion) body.fix_version = options.fixVersion;
        if (options.technicalNotes) body.technical_notes = options.technicalNotes;
        if (options.businessValue) body.business_value = options.businessValue;

        if (options.tags) {
          body.tags = options.tags.split(',').map((s: string) => s.trim());
        }
        if (options.dependsOn) {
          body.depends_on = options.dependsOn.split(',').map((s: string) => s.trim());
        }

        // Parse acceptance criteria
        if (options.acceptanceCriteria) {
          const raw = options.acceptanceCriteria as string;
          if (raw.startsWith('[')) {
            try {
              body.acceptance_criteria = JSON.parse(raw);
            } catch {
              body.acceptance_criteria = [];
            }
          } else {
            body.acceptance_criteria = raw.split('||').map((pair: string) => {
              const colonIdx = pair.indexOf(':');
              if (colonIdx > 0) {
                return { title: pair.slice(0, colonIdx).trim(), criterion: pair.slice(colonIdx + 1).trim() };
              }
              return { title: pair.trim(), criterion: pair.trim() };
            });
          }
        }

        const response = await client.post('/api/stories', body);
        if (!response.ok) {
          formatter.error(response.errors?.join(', ') ?? 'Failed to create story');
          process.exitCode = 1;
          return;
        }

        formatter.output(response.data, (data) => formatter.formatResult(data, 'Story'));

        // Show warnings if present
        if (response.warnings && response.warnings.length > 0) {
          for (const w of response.warnings) {
            formatter.warn(w);
          }
        }
      } catch (error) {
        formatter.error(error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    });
}
