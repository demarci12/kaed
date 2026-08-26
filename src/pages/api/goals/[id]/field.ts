import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/goals';

const EDITABLE_FIELDS = new Set(['title', 'description']);

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

	const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
	update[field] = value || null;

	const { error } = await supabase.from('goals').update(update).eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
