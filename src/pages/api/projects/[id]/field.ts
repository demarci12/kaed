import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

const EDITABLE_FIELDS = new Set([
	'title',
	'description',
	'status',
	'start_date',
	'target_end_date',
	'tagline',
	'website_url',
	'location',
	'team_size',
	'industry',
	'founded_year',
	'funding_stage',
]);
const STATUS_VALUES = new Set(['not_started', 'active', 'done']);
const FUNDING_STAGE_VALUES = new Set(['idea', 'building', 'bootstrapped', 'funded', 'profitable', 'paused']);
const NUMBER_FIELDS = new Set(['team_size', 'founded_year']);

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase } = auth;

	const body = await request.json().catch(() => null);
	const field = body?.field;
	const value = typeof body?.value === 'string' ? body.value.trim() : '';

	if (typeof field !== 'string' || !EDITABLE_FIELDS.has(field)) {
		return new Response(JSON.stringify({ error: 'Field is not editable.' }), { status: 400 });
	}
	if (field === 'status' && !STATUS_VALUES.has(value)) {
		return new Response(JSON.stringify({ error: 'Invalid status.' }), { status: 400 });
	}
	if (field === 'funding_stage' && value && !FUNDING_STAGE_VALUES.has(value)) {
		return new Response(JSON.stringify({ error: 'Invalid funding stage.' }), { status: 400 });
	}
	if (field === 'title' && !value) {
		return new Response(JSON.stringify({ error: 'Title cannot be empty.' }), { status: 400 });
	}

	const update: Record<string, string | number | null> = { updated_at: new Date().toISOString() };
	if (NUMBER_FIELDS.has(field)) {
		if (value && !/^\d+$/.test(value)) {
			return new Response(JSON.stringify({ error: 'Must be a whole number.' }), { status: 400 });
		}
		update[field] = value ? Number(value) : null;
	} else {
		update[field] = value || null;
	}

	const { error } = await supabase.from('projects').update(update).eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
