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
	const position = Number(body?.position);

	if (!Number.isFinite(position) || position < 1) {
		return new Response(JSON.stringify({ error: 'Invalid position.' }), { status: 400 });
	}

	const { data: ideas, error: fetchError } = await supabase
		.from('business_ideas')
		.select('id')
		.order('rank', { ascending: true });

	if (fetchError) {
		return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
	}

	const order = (ideas ?? []).map((idea) => idea.id);
	const currentIndex = order.indexOf(id as string);
	if (currentIndex === -1) {
		return new Response(JSON.stringify({ error: 'Idea not found.' }), { status: 404 });
	}

	const targetIndex = Math.min(Math.max(Math.round(position) - 1, 0), order.length - 1);
	if (targetIndex === currentIndex) {
		return new Response(JSON.stringify({ ok: true, order }), { status: 200 });
	}

	order.splice(currentIndex, 1);
	order.splice(targetIndex, 0, id as string);

	const updates = order
		.map((ideaId, index) => ({ ideaId, rank: index }))
		.filter((_, index) => index >= Math.min(currentIndex, targetIndex) && index <= Math.max(currentIndex, targetIndex));

	const { error: updateError } = (
		await Promise.all(updates.map(({ ideaId, rank }) => supabase.from('business_ideas').update({ rank }).eq('id', ideaId)))
	).find((result) => result.error) ?? {};

	if (updateError) {
		return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true, order }), { status: 200 });
};
