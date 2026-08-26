import { requireOwner } from '../../../../lib/auth';
import { createFieldRoute } from '../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'ideas',
	auth: requireOwner,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		body: { kind: 'text' },
		status: {
			kind: 'enum',
			values: ['open', 'in_progress', 'closed'],
			message: 'Invalid status.',
			required: true,
		},
		contributors: { kind: 'text' },
	},
});
