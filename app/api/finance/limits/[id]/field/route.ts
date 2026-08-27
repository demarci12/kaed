import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'finance_limits',
	fields: {
		mrr_target: { kind: 'number', min: 0, message: 'MRR target must be a number >= 0.' },
	},
});
