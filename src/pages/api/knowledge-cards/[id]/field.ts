import { requireUser } from '../../../../lib/knowledge';
import { createFieldRoute } from '../../../../lib/field-route';

export const POST = createFieldRoute({
	table: 'knowledge_cards',
	auth: requireUser,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		body: { kind: 'text' },
		evidence: { kind: 'text' },
		kind: {
			kind: 'enum',
			values: ['obsession', 'skill', 'experience', 'strength'],
			message: 'Invalid kind.',
		},
	},
});
