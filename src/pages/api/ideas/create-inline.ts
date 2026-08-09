import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase, user } = auth;

	const { data, error } = await supabase
		.from('ideas')
		.insert({ user_id: user.id, title: '' })
		.select('*')
		.single();

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), { status: 500 });
	}

	return new Response(JSON.stringify(data), { status: 200 });
};
