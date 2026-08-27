import { createFieldRoute } from '@/lib/field-route';

export const POST = createFieldRoute({
	table: 'projects',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		title: { kind: 'text', required: true, label: 'Title' },
		mrr: { kind: 'number', min: 0, message: 'MRR must be a number >= 0.' },
		description: { kind: 'text' },
		status: {
			kind: 'enum',
			values: ['not_started', 'active', 'done'],
			message: 'Invalid status.',
			required: true,
		},
		start_date: { kind: 'text' },
		target_end_date: { kind: 'text' },
		tagline: { kind: 'text' },
		website_url: { kind: 'text' },
		location: { kind: 'text' },
		team_size: { kind: 'int', message: 'Must be a whole number.' },
		industry: { kind: 'text' },
		founded_year: { kind: 'int', message: 'Must be a whole number.' },
		funding_stage: {
			kind: 'enum',
			values: ['idea', 'building', 'bootstrapped', 'funded', 'profitable', 'paused'],
			message: 'Invalid funding stage.',
		},
	},
});
