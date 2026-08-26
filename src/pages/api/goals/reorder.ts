import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/goals';

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return new Response(JSON.stringify({ error: 'Not signed in.' }), { status: 401 });
	}
	const { supabase } = auth;

	const body = await request.json().catch(() => null);
	const order = Array.isArray(body?.order) ? body.order.filter((id: unknown) => typeof id === 'string') : null;

	if (!order || !order.length) {
		return new Response(JSON.stringify({ error: 'Invalid order.' }), { status: 400 });
	}

	const results = await Promise.all(
		order.map((id: string, index: number) => supabase.from('goals').update({ rank: index }).eq('id', id)),
	);
	const failed = results.find((result) => result.error);

	if (failed?.error) {
		return new Response(JSON.stringify({ error: failed.error.message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
