import { requireOwner } from '../../../../lib/auth';
import { createFieldRoute } from '../../../../lib/field-route';
import { IDEA_CATEGORIES } from '../../../../lib/idea-categories';

export const POST = createFieldRoute({
	table: 'business_ideas',
	auth: requireOwner,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		pain_point: { kind: 'text' },
		target_market: { kind: 'text' },
		validation: { kind: 'text' },
		category: { kind: 'enum', values: IDEA_CATEGORIES, message: 'Invalid category.' },
	},
});
