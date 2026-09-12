import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'think_pad_entries',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text' },
		body: { kind: 'text', required: true, label: 'Body' },
	},
});
