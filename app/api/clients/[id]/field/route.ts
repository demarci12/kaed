import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'clients',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		name: { kind: 'text', required: true, label: 'Name' },
		company: { kind: 'text' },
		email: { kind: 'text' },
		phone: { kind: 'text' },
		stage: {
			kind: 'enum',
			values: ['lead', 'contacted', 'negotiating', 'won', 'lost'],
			message: 'Invalid stage.',
			required: true,
		},
		next_follow_up: { kind: 'text' },
	},
});
