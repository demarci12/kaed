import { createFieldRoute } from '@/lib/field-route';

/**
 * Inline edits to the single worksheet's prose steps. Separate from
 * /api/idea-lab/[id]/field, which edits an emerged idea -- two different
 * tables, so one shared route would have had to guess which.
 */
export const POST = createFieldRoute({
	table: 'idea_lab',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		background: { kind: 'text' },
		personal_pain: { kind: 'text' },
		money_evidence: { kind: 'text' },
		secret: { kind: 'text' },
		buyer: { kind: 'text' },
		stress_test: { kind: 'text' },
		trap_check: { kind: 'text' },
		score_notes: { kind: 'text' },
		validation: { kind: 'text' },
	},
});
