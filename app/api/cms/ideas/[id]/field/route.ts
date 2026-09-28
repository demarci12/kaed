import { createFieldRoute } from '@/lib/field-route';

/** Edits an idea's text, or puts a failed one back in the queue. */
export const POST = createFieldRoute({
	table: 'cms_ideas',
	ownerOnly: true,
	fields: {
		idea: { kind: 'text', required: true, label: 'Idea' },
		status: { kind: 'enum', values: ['queued'], message: 'Invalid status.', required: true },
	},
	onWrite: (field, _value, update) => {
		if (field === 'status') update.error = null;
	},
});
