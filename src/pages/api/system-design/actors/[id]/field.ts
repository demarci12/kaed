import { requireUser } from '../../../../../lib/system-design';
import { createFieldRoute } from '../../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'system_actors',
	auth: requireUser,
	fields: {
		name: { kind: 'text', required: true, label: 'Name' },
		description: { kind: 'text' },
		kind: {
			kind: 'enum',
			values: ['primary', 'secondary', 'system'],
			message: 'Invalid kind.',
			required: true,
		},
	},
});
