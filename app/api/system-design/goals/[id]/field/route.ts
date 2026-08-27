import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'system_goals',
	ownerOnly: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		description: { kind: 'text' },
	},
});
