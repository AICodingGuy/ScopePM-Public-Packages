import type { ToolRegistryEntry } from './tool-registry.js';

export const EXPLICIT_TOOL_REGISTRY: Record<string, ToolRegistryEntry> = {
  // ========================
  // WRITE TOOLS
  // ========================

  scope_add_epic: {
    method: 'POST',
    path: '/api/epics',
    description:
      "Create a new epic. Fields 'description' and 'business_value' accept Markdown with headings, lists, code blocks, and Mermaid diagrams.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Epic title' },
        description: { type: 'string', description: 'Epic description' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        business_value: {
          type: 'string',
          description: 'REQUIRED. Business value — why this epic matters for the project/users',
        },
      },
      required: ['title', 'priority', 'business_value'],
    },
  },

  scope_update_epic: {
    method: 'PUT',
    path: '/api/epics/:id',
    paramMapping: { id: 'id' },
    description:
      'Update one or more fields of an existing epic (partial update). Use this to change title, description, priority, status, or business_value.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Epic ID to update (e.g. E001)' },
        title: { type: 'string', description: 'New title' },
        description: { type: 'string', description: 'New description (Markdown supported)' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        status: { type: 'string', enum: ['defined', 'in_progress', 'done'] },
        business_value: { type: 'string', description: 'Business value description' },
      },
      required: ['id'],
    },
  },

  scope_add_story: {
    method: 'POST',
    path: '/api/stories',
    description:
      'Create a new user story. REQUIRED: business_value, technical_notes, component, story_points.',
    inputSchema: {
      type: 'object',
      properties: {
        epic_id: { type: 'string', description: 'Epic ID (e.g. E001)' },
        title: { type: 'string' },
        as_a: { type: 'string' },
        i_want: { type: 'string' },
        so_that: { type: 'string' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        story_points: { type: 'number', description: 'REQUIRED. Fibonacci: 1,2,3,5,8,13,21' },
        depends_on: { type: 'array', items: { type: 'string' }, description: 'Story IDs this depends on' },
        acceptance_criteria: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              criterion: { type: 'string' },
            },
            required: ['title', 'criterion'],
          },
        },
        tags: { type: 'array', items: { type: 'string' } },
        technical_notes: { type: 'string', description: 'REQUIRED. Solution approach, architecture, key files' },
        component: { type: 'string', description: 'REQUIRED. Component (e.g. core, cli, mcp, web)' },
        fix_version: { type: 'string' },
        business_value: { type: 'string', description: 'REQUIRED. Why this story matters' },
      },
      required: ['epic_id', 'title', 'as_a', 'i_want', 'so_that', 'priority', 'story_points', 'technical_notes', 'component', 'business_value'],
    },
  },

  scope_update_story: {
    method: 'PUT',
    path: '/api/stories/:id',
    paramMapping: { id: 'id' },
    description:
      "Update one or more fields of an existing story (partial update). Text fields accept full Markdown.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Story ID to update' },
        title: { type: 'string' },
        as_a: { type: 'string' },
        i_want: { type: 'string' },
        so_that: { type: 'string' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        story_points: { type: 'number' },
        status: { type: 'string', enum: ['defined', 'in_progress', 'done'] },
        technical_notes: { type: 'string' },
        component: { type: 'string' },
        fix_version: { type: 'string' },
        business_value: { type: 'string' },
        assigned_to: { type: 'string', nullable: true },
      },
      required: ['id'],
    },
  },

  scope_add_subtask: {
    method: 'POST',
    path: '/api/subtasks',
    description:
      'Add a subtask to an existing story. REQUIRED: description and technical_notes.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID (e.g. US001)' },
        title: { type: 'string' },
        type: { type: 'string', enum: ['frontend', 'backend', 'infra', 'test', 'docs', 'design'] },
        estimated_hours: { type: 'number', description: 'Estimated hours (must be > 0)' },
        description: { type: 'string', description: 'REQUIRED. Detailed description' },
        technical_notes: { type: 'string', description: 'REQUIRED. Structured with ### Approach, ### Key Files, ### Decisions, ### Status' },
      },
      required: ['story_id', 'title', 'type', 'estimated_hours', 'description', 'technical_notes'],
    },
  },

  scope_update_subtask: {
    method: 'PUT',
    path: '/api/subtasks/:id',
    paramMapping: { id: 'id' },
    description:
      "Update a subtask's fields (partial update). Use 'technical_notes' to document implementation progress.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Subtask ID to update (e.g. ST001)' },
        title: { type: 'string' },
        type: { type: 'string', enum: ['frontend', 'backend', 'infra', 'test', 'docs', 'design'] },
        estimated_hours: { type: 'number' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        description: { type: 'string', nullable: true },
        technical_notes: { type: 'string', nullable: true },
      },
      required: ['id'],
    },
  },

  scope_add_decision: {
    method: 'POST',
    path: '/api/decisions',
    description:
      'Create an Architecture Decision Record (ADR). All text fields accept full Markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        context: { type: 'string' },
        decision: { type: 'string' },
        consequences: { type: 'string' },
      },
      required: ['title', 'context', 'decision'],
    },
  },

  scope_add_comment: {
    method: 'POST',
    path: '/api/comments',
    description:
      'Add a comment to an epic, story, or subtask. Use for session notes, progress updates, blockers.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', enum: ['epic', 'story', 'subtask'] },
        entity_id: { type: 'string', description: 'Entity ID (e.g. E001, US001, ST001)' },
        content: { type: 'string', description: 'Comment content (Markdown supported)' },
        author: { type: 'string', description: 'Author name (default: agent)' },
      },
      required: ['entity_type', 'entity_id', 'content'],
    },
  },

  scope_add_dependency: {
    method: 'POST',
    path: '/api/stories/:id/dependencies',
    paramMapping: { story_id: 'id' },
    description: 'Add a dependency between two stories. Rejects if it would create a cycle.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story that depends on another' },
        depends_on_id: { type: 'string', description: 'Story that is depended upon' },
      },
      required: ['story_id', 'depends_on_id'],
    },
  },

  scope_remove_dependency: {
    method: 'DELETE',
    path: '/api/stories/:id/dependencies/:depId',
    paramMapping: { story_id: 'id', depends_on_id: 'depId' },
    description: 'Remove a dependency between two stories.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string' },
        depends_on_id: { type: 'string' },
      },
      required: ['story_id', 'depends_on_id'],
    },
  },

  scope_add_parking_lot_item: {
    method: 'POST',
    path: '/api/parking-lot',
    description:
      "Add an item to the parking lot for tracking out-of-scope ideas, deferred features, or tech debt.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the parking lot item' },
        description: { type: 'string', description: 'Detailed description (supports Markdown)' },
        category: { type: 'string', enum: ['idea', 'deferred', 'out_of_scope', 'tech_debt'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        source_epic_id: { type: 'string' },
        source_story_id: { type: 'string' },
      },
      required: ['title'],
    },
  },

  scope_update_parking_lot_item: {
    method: 'PUT',
    path: '/api/parking-lot/:id',
    paramMapping: { id: 'id' },
    description: "Update a parking lot item's fields.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Parking lot item ID (e.g. PL001)' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: ['idea', 'deferred', 'out_of_scope', 'tech_debt'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
      },
      required: ['id'],
    },
  },

  scope_promote_parking_lot_item: {
    method: 'POST',
    path: '/api/parking-lot/:id/promote',
    paramMapping: { id: 'id' },
    description:
      'Promote a parking lot item to a full Story. Provide epic_id for the target epic.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Parking lot item ID (e.g. PL001)' },
        epic_id: { type: 'string', description: 'Target epic ID (e.g. E001)' },
        as_a: { type: 'string' },
        i_want: { type: 'string' },
        so_that: { type: 'string' },
        story_points: { type: 'number' },
        component: { type: 'string' },
        business_value: { type: 'string' },
        technical_notes: { type: 'string' },
      },
      required: ['id', 'epic_id'],
    },
  },

  scope_delete_parking_lot_item: {
    method: 'DELETE',
    path: '/api/parking-lot/:id',
    paramMapping: { id: 'id' },
    description: 'Delete a parking lot item.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Parking lot item ID to delete (e.g. PL001)' },
      },
      required: ['id'],
    },
  },

  scope_add_review: {
    method: 'POST',
    path: '/api/reviews',
    description:
      'Add a structured review annotation to a story.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID (e.g. US001)' },
        reviewer: { type: 'string' },
        review_type: { type: 'string', enum: ['approval', 'suggestion', 'concern', 'question', 'rejection'] },
        content: { type: 'string', description: 'Review feedback text' },
        target_field: { type: 'string' },
        suggested_value: { type: 'string' },
        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
      },
      required: ['story_id', 'reviewer', 'review_type', 'content'],
    },
  },

  scope_resolve_review: {
    method: 'PUT',
    path: '/api/reviews/:id/resolve',
    paramMapping: { annotation_id: 'id' },
    description:
      'Resolve a review annotation as accepted, rejected, or acknowledged.',
    inputSchema: {
      type: 'object',
      properties: {
        annotation_id: { type: 'string', description: 'Review annotation ID (e.g. RA001)' },
        status: { type: 'string', enum: ['accepted', 'rejected', 'acknowledged'] },
        resolved_by: { type: 'string' },
        resolution_note: { type: 'string' },
      },
      required: ['annotation_id', 'status', 'resolved_by'],
    },
  },

  scope_request_review: {
    method: 'POST',
    path: '/api/reviews/request',
    description:
      'Request review for a story.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID (e.g. US001)' },
        requested_by: { type: 'string' },
        reviewers: { type: 'array', items: { type: 'string' } },
      },
      required: ['story_id', 'requested_by'],
    },
  },

  scope_bulk_add_stories: {
    method: 'POST',
    path: '/api/stories/bulk',
    description: 'Create multiple stories in a single transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        stories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              epic_id: { type: 'string' },
              title: { type: 'string' },
              as_a: { type: 'string' },
              i_want: { type: 'string' },
              so_that: { type: 'string' },
              priority: { type: 'string' },
              story_points: { type: 'number' },
              technical_notes: { type: 'string' },
              component: { type: 'string' },
              business_value: { type: 'string' },
            },
          },
        },
      },
      required: ['stories'],
    },
  },

  scope_assign_story: {
    method: 'PUT',
    path: '/api/stories/:id',
    paramMapping: { story_id: 'id' },
    description: 'Assign or unassign a story to a user/agent.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID (e.g. US001)' },
        assigned_to: { type: 'string', nullable: true },
      },
      required: ['story_id', 'assigned_to'],
    },
  },

  scope_batch: {
    method: 'POST',
    path: '/api/batch',
    description: 'Execute multiple write operations in a single transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string', description: 'Tool name (e.g. scope_add_epic)' },
              args: { type: 'object', description: 'Tool arguments' },
            },
            required: ['tool', 'args'],
          },
        },
        atomic: { type: 'boolean' },
      },
      required: ['operations'],
    },
  },

  scope_delete_epic: {
    method: 'DELETE',
    path: '/api/epics/:id',
    paramMapping: { id: 'id' },
    description: 'Soft-delete an epic.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Epic ID to delete (e.g. E001)' },
      },
      required: ['id'],
    },
  },

  scope_delete_story: {
    method: 'DELETE',
    path: '/api/stories/:id',
    paramMapping: { id: 'id' },
    description: 'Soft-delete a story.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Story ID to delete (e.g. US001)' },
      },
      required: ['id'],
    },
  },

  scope_delete_subtask: {
    method: 'DELETE',
    path: '/api/subtasks/:id',
    paramMapping: { id: 'id' },
    description: 'Soft-delete a subtask.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Subtask ID to delete (e.g. ST001)' },
      },
      required: ['id'],
    },
  },

  scope_delete_decision: {
    method: 'DELETE',
    path: '/api/decisions/:id',
    paramMapping: { id: 'id' },
    description: 'Soft-delete a decision.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Decision ID to delete (e.g. ADR001)' },
      },
      required: ['id'],
    },
  },

  scope_delete_comment: {
    method: 'DELETE',
    path: '/api/comments/:id',
    paramMapping: { id: 'id' },
    description: 'Delete a comment.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Comment ID to delete (e.g. C001)' },
      },
      required: ['id'],
    },
  },

  scope_demote_story: {
    method: 'POST',
    path: '/api/stories/:id/demote',
    paramMapping: { id: 'id' },
    description: 'Safely demote a story to the parking lot.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Story ID to demote (e.g. US001)' },
        preflight: { type: 'boolean' },
        force: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['id'],
    },
  },

  scope_quick_fix: {
    method: 'POST',
    path: '/api/analytics/quick-fix',
    description: 'Document a small fix without full story ceremony.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: { type: 'string' },
        description: { type: 'string' },
        files_changed: { type: 'array', items: { type: 'string' } },
      },
      required: ['entity_id', 'description'],
    },
  },

  // ========================
  // READ TOOLS
  // ========================

  scope_status: {
    method: 'GET',
    path: '/api/status',
    description: 'Get aggregated status overview of the entire scope.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_query: {
    method: 'GET',
    path: '/api/stories',
    flattenFilter: true,
    queryParams: ['epic_id', 'status', 'priority', 'component', 'tags', 'search', 'sort', 'format', 'limit', 'offset', 'include_deleted', 'is_paused'],
    description:
      'Query stories with flexible filters, pagination, and format control.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'object',
          properties: {
            epic_id: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            component: { type: 'string' },
            is_paused: { type: 'boolean' },
          },
        },
        search: { type: 'string' },
        sort: { type: 'string', enum: ['topological', 'priority', 'id'] },
        format: { type: 'string', enum: ['summary', 'full'] },
        limit: { type: 'number' },
        offset: { type: 'number' },
        include_deleted: { type: 'boolean' },
      },
    },
  },

  scope_validate: {
    method: 'GET',
    path: '/api/validate',
    description: 'Run all validation rules and return findings.',
    inputSchema: {
      type: 'object',
      properties: {
        fix: { type: 'boolean' },
      },
    },
  },

  scope_sort: {
    method: 'GET',
    path: '/api/sort',
    queryParams: ['capacity'],
    description: 'Get topologically sorted story list with sprint suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        capacity: { type: 'number', description: 'Sprint capacity in story points' },
      },
    },
  },

  scope_export_json: {
    method: 'GET',
    path: '/api/export/json',
    description: 'Export the entire scope as a JSON snapshot.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_export_csv: {
    method: 'GET',
    path: '/api/export/csv',
    description: 'Export stories as CSV.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_export_full: {
    method: 'GET',
    path: '/api/export/csv',
    description: 'Export complete scope as CSV with all details.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_export_markdown: {
    method: 'GET',
    path: '/api/export/markdown',
    description: 'Export complete scope as a single Markdown document.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_graph: {
    method: 'GET',
    path: '/api/graph',
    description: 'Generate a Mermaid dependency graph diagram.',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_get_reviews: {
    method: 'GET',
    path: '/api/reviews',
    queryParams: ['story_id', 'status', 'reviewer'],
    description: 'Get review annotations for a story.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID (e.g. US001)' },
        status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'acknowledged'] },
        reviewer: { type: 'string' },
      },
      required: ['story_id'],
    },
  },

  scope_list_parking_lot: {
    method: 'GET',
    path: '/api/parking-lot',
    queryParams: ['category'],
    description: 'List parking lot items. Optionally filter by category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['idea', 'deferred', 'out_of_scope', 'tech_debt'] },
      },
    },
  },

  // ========================
  // WORKFLOW TOOLS
  // ========================

  scope_what_next: {
    method: 'GET',
    path: '/api/what-next',
    description: 'Suggest the next actionable story (no open dependencies, highest priority).',
    inputSchema: { type: 'object', properties: {} },
  },

  scope_session_summary: {
    method: 'GET',
    path: '/api/analytics/session-summary',
    queryParams: ['limit'],
    description:
      'Returns recent activity for session context recovery, plus ADR digest, component registry, and validation warnings.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of recent comments to return (default: 20)' },
      },
    },
  },

  scope_plan_sprints: {
    method: 'POST',
    path: '/api/sprints',
    description: 'Generate sprint planning suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        capacity: { type: 'number', description: 'Sprint capacity in story points (default: 20)' },
      },
    },
  },

  scope_plan_execution: {
    method: 'POST',
    path: '/api/analytics/plan-execution',
    description: 'Generate a detailed execution plan for a story.',
    inputSchema: {
      type: 'object',
      properties: {
        story_id: { type: 'string', description: 'Story ID to generate execution plan for (e.g. US001)' },
      },
      required: ['story_id'],
    },
  },

  scope_diff: {
    method: 'POST',
    path: '/api/analytics/diff',
    description: 'Compare a saved snapshot against the current DB state.',
    inputSchema: {
      type: 'object',
      properties: {
        baseline: { type: 'object', description: 'A previously exported snapshot.' },
      },
      required: ['baseline'],
    },
  },

  scope_events: {
    method: 'GET',
    path: '/api/events',
    queryParams: ['entity_type', 'entity_id', 'event_type', 'actor', 'limit', 'offset'],
    description: 'Query the event log for scope changes.',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string' },
        entity_id: { type: 'string' },
        event_type: { type: 'string' },
        actor: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' },
      },
    },
  },

  scope_detect_conflicts: {
    method: 'GET',
    path: '/api/analytics/conflicts',
    queryParams: ['agent_id', 'story_id'],
    description: 'Detect if other agents are working on the same story.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Your agent identifier' },
        story_id: { type: 'string', description: 'Story ID to check (optional)' },
      },
      required: ['agent_id'],
    },
  },
};
