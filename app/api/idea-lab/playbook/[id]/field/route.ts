import { createFieldRoute } from '@/lib/field-route';

/** Inline edits to the Idea Lab playbook's sections (title + raw-markdown body + personal notes). */
export const POST = createFieldRoute({
	table: 'idea_lab_playbook',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		body: { kind: 'text' },
		notes: { kind: 'text' },
	},
});
