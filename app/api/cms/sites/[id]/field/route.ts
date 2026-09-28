import { createFieldRoute } from '@/lib/field-route';

/** Inline edits to a site's settings. */
export const POST = createFieldRoute({
	table: 'cms_sites',
	ownerOnly: true,
	touchUpdatedAt: true,
	fields: {
		name: { kind: 'text', required: true, label: 'Name' },
		domain: { kind: 'text' },
		language: { kind: 'text', required: true, label: 'Language' },
		brand_context: { kind: 'text' },
		deploy_hook_url: { kind: 'text' },
		timezone: { kind: 'text', required: true, label: 'Timezone' },
		active: { kind: 'enum', values: ['true', 'false'], message: 'Invalid value.', required: true },
		auto_publish: { kind: 'enum', values: ['true', 'false'], message: 'Invalid value.', required: true },
		publish_hour: { kind: 'int', message: 'Hour must be a whole number.' },
		buffer: { kind: 'int', message: 'Buffer must be a whole number.' },
		schedule_days: { kind: 'text' },
	},
	onWrite: (field, value, update) => {
		if (field === 'active' || field === 'auto_publish') update[field] = value === 'true';
		if (field === 'schedule_days') {
			update[field] = value.split(',').map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
		}
		if (field === 'publish_hour') {
			const h = Number(value);
			update[field] = Number.isInteger(h) ? Math.min(Math.max(h, 0), 23) : 9;
		}
		if (field === 'buffer') {
			const b = Number(value);
			update[field] = Number.isInteger(b) ? Math.min(Math.max(b, 1), 10) : 2;
		}
	},
});
