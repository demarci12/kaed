import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'finance_categories',
	fields: {
		name: { kind: 'text', required: true, label: 'Name' },
		default_amount: {
			kind: 'number',
			required: true,
			min: 0,
			message: 'Default amount must be a number >= 0.',
		},
		interest_rate: { kind: 'number', message: 'Interest rate must be a number.' },
	},
});
