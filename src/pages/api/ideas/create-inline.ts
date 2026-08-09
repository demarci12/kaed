import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase, user } = auth;

	const body = await request.json().catch(() => null);
	const x = Number(body?.position_x);
	const y = Number(body?.position_y);

	const { data, error } = await supabase
		.from('ideas')
		.insert({
			user_id: user.id,
			title: 'Untitled idea',
			...(Number.isFinite(x) && Number.isFinite(y)
				? { position_x: Math.round(x), position_y: Math.round(y) }
				: {}),
		})
		.select('*')
		.single();

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify(data), { status: 200 });
};
