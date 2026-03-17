import chalk from 'chalk';

/**
 * Output formatter for the Scope PM CLI.
 * Supports human-readable colored output and --json raw output.
 */
export class Formatter {
  constructor(private readonly jsonMode: boolean) {}

  isJsonMode(): boolean {
    return this.jsonMode;
  }

  /**
   * Output a successful API response. In JSON mode outputs raw data,
   * in human mode calls the provided format function.
   */
  output(data: unknown, formatFn?: (data: unknown) => string): void {
    if (this.jsonMode) {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    } else if (formatFn) {
      process.stdout.write(formatFn(data) + '\n');
    } else {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n');
    }
  }

  /**
   * Output an error message to stderr.
   */
  error(message: string): void {
    process.stderr.write(chalk.red('Error: ') + message + '\n');
  }

  /**
   * Output a warning message to stderr.
   */
  warn(message: string): void {
    process.stderr.write(chalk.yellow('Warning: ') + message + '\n');
  }

  /**
   * Output a success message.
   */
  success(message: string): void {
    if (!this.jsonMode) {
      process.stdout.write(chalk.green(message) + '\n');
    }
  }

  /**
   * Format a status overview for human-readable output.
   */
  formatStatus(data: unknown): string {
    const status = data as {
      epics: number;
      stories: number;
      subtasks: number;
      decisions: number;
      total_sp: number;
      by_priority: Record<string, number>;
      by_status: Record<string, number>;
    };

    const lines: string[] = [
      chalk.bold('Scope Registry Status'),
      chalk.dim('====================='),
      `Epics:      ${status.epics}`,
      `Stories:    ${status.stories}`,
      `Subtasks:   ${status.subtasks}`,
      `Decisions:  ${status.decisions}`,
      `Total SP:   ${status.total_sp}`,
      '',
      chalk.bold('By Priority:'),
    ];

    for (const [p, count] of Object.entries(status.by_priority ?? {})) {
      lines.push(`  ${colorPriority(p)}: ${count}`);
    }

    lines.push('');
    lines.push(chalk.bold('By Status:'));
    for (const [s, count] of Object.entries(status.by_status ?? {})) {
      lines.push(`  ${colorStatus(s)}: ${count}`);
    }

    return lines.join('\n');
  }

  /**
   * Format validation results for human-readable output.
   */
  formatValidation(data: unknown): string {
    const result = data as {
      ok: boolean;
      findings: Array<{ rule: string; severity: string; message: string }>;
      summary: { errors: number; warnings: number; infos: number };
    };

    const lines: string[] = [];

    for (const finding of result.findings) {
      const icon = finding.severity === 'error'
        ? chalk.red('FAIL')
        : finding.severity === 'warning'
          ? chalk.yellow('WARN')
          : chalk.blue('INFO');
      lines.push(`${icon}  ${finding.rule}: ${finding.message}`);
    }

    if (result.findings.length === 0) {
      lines.push(chalk.green('All checks passed.'));
    }

    lines.push('');
    lines.push(
      `Summary: ${chalk.red(`${result.summary.errors} errors`)}, ${chalk.yellow(`${result.summary.warnings} warnings`)}, ${result.summary.infos} infos`,
    );

    return lines.join('\n');
  }

  /**
   * Format a list of stories for human-readable output.
   */
  formatStories(stories: unknown[]): string {
    if (stories.length === 0) {
      return chalk.dim('No stories found.');
    }

    const lines: string[] = [];
    for (const s of stories) {
      const story = s as {
        id: string;
        title: string;
        status: string;
        priority: string;
        story_points?: number | null;
        component?: string;
        epic_id: string;
      };
      const sp = story.story_points ? `SP:${story.story_points}` : 'SP:?';
      const comp = story.component || '?';
      lines.push(
        `  ${chalk.bold(story.id)} ${colorStatus(story.status.padEnd(11))} ${colorPriority(story.priority.padEnd(8))} ${sp.padEnd(5)} ${chalk.dim(comp.padEnd(8))} ${story.title.substring(0, 60)}`,
      );
    }

    lines.push('');
    lines.push(chalk.dim(`${stories.length} stories`));
    return lines.join('\n');
  }

  /**
   * Format a list of epics for human-readable output.
   */
  formatEpics(epics: unknown[]): string {
    if (epics.length === 0) {
      return chalk.dim('No epics found.');
    }

    const lines: string[] = [];
    for (const e of epics) {
      const epic = e as {
        id: string;
        title: string;
        status: string;
        priority: string;
        story_count?: number;
        done_count?: number;
        total_sp?: number;
      };
      const storyInfo = epic.story_count !== undefined
        ? `${epic.done_count ?? 0}/${epic.story_count} stories`
        : '';
      const sp = epic.total_sp !== undefined ? `${epic.total_sp}SP` : '';
      lines.push(
        `  ${chalk.bold(epic.id)} ${colorStatus(epic.status.padEnd(11))} ${colorPriority(epic.priority.padEnd(8))} ${storyInfo.padEnd(15)} ${sp.padEnd(6)} ${epic.title.substring(0, 50)}`,
      );
    }

    lines.push('');
    lines.push(chalk.dim(`${epics.length} epics`));
    return lines.join('\n');
  }

  /**
   * Format a list of parking lot items for human-readable output.
   */
  formatParkingLot(items: unknown[]): string {
    if (items.length === 0) {
      return chalk.dim('No parking lot items found.');
    }

    const lines: string[] = [];
    for (const item of items) {
      const i = item as {
        id: string;
        title: string;
        category: string;
        priority: string;
        source_story_id?: string | null;
      };
      const source = i.source_story_id ? chalk.dim(` (from ${i.source_story_id})`) : '';
      lines.push(
        `  ${chalk.bold(i.id)} ${chalk.cyan(i.category.padEnd(12))} ${colorPriority(i.priority.padEnd(8))} ${i.title.substring(0, 60)}${source}`,
      );
    }

    lines.push('');
    lines.push(chalk.dim(`${items.length} items`));
    return lines.join('\n');
  }

  /**
   * Format a list of decisions for human-readable output.
   */
  formatDecisions(decisions: unknown[]): string {
    if (decisions.length === 0) {
      return chalk.dim('No decisions found.');
    }

    const lines: string[] = [];
    for (const d of decisions) {
      const dec = d as {
        id: string;
        title: string;
        status: string;
        decision: string;
      };
      const statusColor = dec.status === 'accepted'
        ? chalk.green(dec.status)
        : dec.status === 'deprecated'
          ? chalk.red(dec.status)
          : chalk.yellow(dec.status);
      lines.push(
        `  ${chalk.bold(dec.id)} [${statusColor}] ${dec.title}`,
      );
      lines.push(
        `    ${chalk.dim(dec.decision.substring(0, 80))}`,
      );
    }

    lines.push('');
    lines.push(chalk.dim(`${decisions.length} decisions`));
    return lines.join('\n');
  }

  /**
   * Format a simple creation/update result.
   */
  formatResult(result: unknown, entityType: string): string {
    const r = result as { id?: string; [key: string]: unknown };
    if (r.id) {
      return chalk.green(`${entityType} created: ${r.id}`);
    }
    return chalk.green(`${entityType} operation successful`);
  }
}

/**
 * Color a status string based on its value.
 */
function colorStatus(status: string): string {
  const trimmed = status.trim();
  switch (trimmed) {
    case 'done': return chalk.green(status);
    case 'in_progress': return chalk.yellow(status);
    case 'defined': return chalk.gray(status);
    case 'todo': return chalk.gray(status);
    default: return status;
  }
}

/**
 * Color a priority string based on its value.
 */
function colorPriority(priority: string): string {
  const trimmed = priority.trim();
  switch (trimmed) {
    case 'critical': return chalk.red(priority);
    case 'high': return chalk.hex('#FF8C00')(priority);
    case 'medium': return chalk.blue(priority);
    case 'low': return chalk.gray(priority);
    default: return priority;
  }
}

export { colorStatus, colorPriority };
