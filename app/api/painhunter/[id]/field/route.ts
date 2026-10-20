import { createFieldRoute } from '@/lib/field-route';
import { PAIN_CONTEXTS, PAIN_SOURCES, SCORE_FIELDS } from '@/lib/painhunter';

const SCORE_VALUES = ['1', '2', '3', '4', '5'];

export const POST = createFieldRoute({
	table: 'pain_points',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		details: { kind: 'text' },
		who: { kind: 'text' },
		workaround: { kind: 'text' },
		noticed_on: { kind: 'text', required: true, label: 'Date' },
		source: { kind: 'enum', values: PAIN_SOURCES, message: 'Invalid source.', required: true },
		context: { kind: 'enum', values: PAIN_CONTEXTS, message: 'Invalid context.' },
		...Object.fromEntries(
			SCORE_FIELDS.map((f) => [f, { kind: 'enum', values: SCORE_VALUES, message: 'A score is 1 to 5.' } as const]),
		),
	},
	// The enum kind stores the raw string; the score columns are smallints.
	onWrite: (field, value, update) => {
		if (SCORE_FIELDS.includes(field) && value) update[field] = Number(value);
	},
});
