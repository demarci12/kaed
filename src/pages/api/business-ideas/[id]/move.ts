import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase } = auth;
	const { id } = params;

	const body = await request.json().catch(() => null);
	const direction = body?.direction;

	if (direction !== 'up' && direction !== 'down') {
		return new Response(JSON.stringify({ error: 'Invalid move.' }), { status: 400 });
	}

	const { data: current } = await supabase
		.from('business_ideas')
		.select('id, rank')
		.eq('id', id)
		.maybeSingle();

	if (!current) {
		return new Response(JSON.stringify({ error: 'Idea not found.' }), { status: 404 });
	}

	let neighborQuery = supabase
		.from('business_ideas')
		.select('id, rank')
		.order('rank', { ascending: direction === 'down' })
		.limit(1);

	neighborQuery = direction === 'up' ? neighborQuery.lt('rank', current.rank) : neighborQuery.gt('rank', current.rank);

	const { data: neighbor } = await neighborQuery.maybeSingle();

	if (!neighbor) {
		return new Response(JSON.stringify({ ok: true, moved: false }), { status: 200 });
	}

	const [{ error: err1 }, { error: err2 }] = await Promise.all([
		supabase.from('business_ideas').update({ rank: neighbor.rank }).eq('id', current.id),
		supabase.from('business_ideas').update({ rank: current.rank }).eq('id', neighbor.id),
	]);

	if (err1 || err2) {
		return new Response(JSON.stringify({ error: (err1 || err2)!.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true, moved: true, swappedWithId: neighbor.id }), { status: 200 });
};
