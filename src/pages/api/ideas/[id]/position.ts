import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase } = auth;

	const body = await request.json().catch(() => null);
	const x = Number(body?.position_x);
	const y = Number(body?.position_y);

	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return new Response(JSON.stringify({ error: 'Invalid position.' }), { status: 400 });
	}

	const { error } = await supabase
		.from('ideas')
		.update({ position_x: Math.round(x), position_y: Math.round(y) })
		.eq('id', params.id);

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
