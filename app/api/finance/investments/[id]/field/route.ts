import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'investments',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		symbol: { kind: 'text', required: true, label: 'Symbol' },
		cmc_slug: { kind: 'text' },
		quantity: { kind: 'number', min: 0, message: 'Quantity must be a number >= 0.', required: true },
		cost_basis_huf: { kind: 'number', min: 0, message: 'Invested amount must be a number >= 0.', required: true },
		goal_price_usd: { kind: 'number', min: 0, message: 'Goal price must be a number >= 0.' },
	},
});
