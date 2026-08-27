import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'system_requirements',
	ownerOnly: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		description: { kind: 'text' },
		kind: {
			kind: 'enum',
			values: ['functional', 'non_functional'],
			message: 'Invalid kind.',
			required: true,
		},
		priority: {
			kind: 'enum',
			values: ['must', 'should', 'could', 'wont'],
			message: 'Invalid priority.',
			required: true,
		},
		use_case_id: { kind: 'ref' },
	},
});
