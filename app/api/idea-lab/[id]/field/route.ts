import { createFieldRoute } from '@/lib/field-route';
import { IDEA_DECISIONS } from '@/lib/idea-lab';

export const POST = createFieldRoute({
	table: 'idea_candidates',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		domains: { kind: 'text' },
		personal_pain: { kind: 'text' },
		money_evidence: { kind: 'text' },
		secret: { kind: 'text' },
		buyer: { kind: 'text' },
		stress_test: { kind: 'text' },
		trap_check: { kind: 'text' },
		score_notes: { kind: 'text' },
		validation: { kind: 'text' },
		decision: { kind: 'enum', values: IDEA_DECISIONS, message: 'Invalid decision.', required: true },
	},
});
