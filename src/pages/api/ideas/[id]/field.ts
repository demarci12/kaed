import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

const EDITABLE_FIELDS = new Set(['title', 'body', 'status', 'contributors']);
const STATUSES = new Set(['open', 'in_progress', 'closed']);

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
	if (field === 'title' && !value) {
		return new Response(JSON.stringify({ error: 'Title cannot be empty.' }), { status: 400 });
	}
	if (field === 'status' && !STATUSES.has(value)) {
		return new Response(JSON.stringify({ error: 'Invalid status.' }), { status: 400 });
	}
	const update: Record<string, string | null> = {};
	update[field] = field === 'status' ? value : value || null;

	const { error } = await supabase.from('ideas').update(update).eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
