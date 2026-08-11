import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase, user } = auth;

	const body = await request.json().catch(() => null);
	const fromIdeaId = String(body?.from_idea_id ?? '').trim();
	const toIdeaId = String(body?.to_idea_id ?? '').trim();

	if (!fromIdeaId || !toIdeaId || fromIdeaId === toIdeaId) {
		return new Response(JSON.stringify({ error: 'Invalid connection.' }), { status: 400 });
	}

	const { data: existing } = await supabase
		.from('idea_connections')
		.select('id')
		.or(
			`and(from_idea_id.eq.${fromIdeaId},to_idea_id.eq.${toIdeaId}),and(from_idea_id.eq.${toIdeaId},to_idea_id.eq.${fromIdeaId})`
		)
		.maybeSingle();

	if (existing) {
		return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
	}

	const { data, error } = await supabase
		.from('idea_connections')
		.insert({ user_id: user.id, from_idea_id: fromIdeaId, to_idea_id: toIdeaId })
		.select('id')
		.single();

	if (error) {
		// Unique violation means this connection already exists — not an error from the UI's perspective.
		if (error.code === '23505') {
			return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
		}
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 });
};
