import { requireUser } from '../../../../../lib/system-design';
import { createFieldRoute } from '../../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'system_use_cases',
	auth: requireUser,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		description: { kind: 'text' },
		preconditions: { kind: 'text' },
		main_flow: { kind: 'text' },
		postconditions: { kind: 'text' },
		actor_id: { kind: 'ref' },
	},
});
