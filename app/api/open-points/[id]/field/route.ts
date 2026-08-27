import { createFieldRoute } from '@/lib/field-route';
import { OPEN_POINT_STATUSES } from '@/lib/open-points';

/**
 * The `link` pseudo-field carries both parent kinds in one dropdown value
 * (`g_<uuid>` / `p_<uuid>` / empty) so a single select can express "goal",
 * "project", or "unlinked". It is expanded into the real goal_id/project_id
 * columns here, always writing BOTH so the two can never end up set at once
 * -- writing them independently would violate open_points_single_parent and
 * surface a raw Postgres error in the inline editor.
 */
export const POST = createFieldRoute({
	table: 'open_points',
	ownerOnly: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		body: { kind: 'text' },
		status: { kind: 'enum', values: OPEN_POINT_STATUSES, message: 'Invalid status.', required: true },
		contributors: { kind: 'text' },
		link: { kind: 'text' },
	},
	onWrite: (field, value, update) => {
		if (field !== 'link') return;
		delete update.link;
		update.goal_id = value.startsWith('g_') ? value.slice(2) : null;
		update.project_id = value.startsWith('p_') ? value.slice(2) : null;
	},
});
