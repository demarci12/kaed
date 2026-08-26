import { requireUser } from '../../../../../lib/system-design';
import { createFieldRoute } from '../../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'system_goals',
	auth: requireUser,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		description: { kind: 'text' },
	},
});
