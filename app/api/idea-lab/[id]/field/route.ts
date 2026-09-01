import { createFieldRoute } from '@/lib/field-route';
import { IDEA_DECISIONS } from '@/lib/idea-lab';

/** Inline edits to one emerged idea. The step prose lives on the worksheet. */
export const POST = createFieldRoute({
	table: 'idea_candidates',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		note: { kind: 'text' },
		decision: { kind: 'enum', values: IDEA_DECISIONS, message: 'Invalid decision.', required: true },
	},
});
