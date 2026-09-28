import { createFieldRoute } from '@/lib/field-route';

/** Inline edits to the Idea Lab's thinking space. */
export const POST = createFieldRoute({
	table: 'idea_lab',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		thinking: { kind: 'text' },
	},
});
