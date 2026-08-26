import { requireUser } from '../../../../lib/goals';
import { createFieldRoute } from '../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'goals',
	auth: requireUser,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		description: { kind: 'text' },
	},
});
