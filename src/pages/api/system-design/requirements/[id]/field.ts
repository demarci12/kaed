import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../lib/system-design';

const EDITABLE_FIELDS = new Set(['title', 'description', 'kind', 'priority', 'use_case_id']);
const KINDS = new Set(['functional', 'non_functional']);
const PRIORITIES = new Set(['must', 'should', 'could', 'wont']);

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireUser(request, cookies);
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
	if (field === 'title' && !value) {
		return new Response(JSON.stringify({ error: 'Title cannot be empty.' }), { status: 400 });
	}
	if (field === 'kind' && !KINDS.has(value)) {
		return new Response(JSON.stringify({ error: 'Invalid kind.' }), { status: 400 });
	}
	if (field === 'priority' && !PRIORITIES.has(value)) {
		return new Response(JSON.stringify({ error: 'Invalid priority.' }), { status: 400 });
	}

	const update: Record<string, string | null> = {};
	update[field] = field === 'kind' || field === 'priority' ? value : value || null;

	const { error } = await supabase.from('system_requirements').update(update).eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
