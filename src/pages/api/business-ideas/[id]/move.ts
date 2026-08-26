import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;
	const { id } = params;

	const form = await request.formData();
	const direction = String(form.get('direction') ?? '');

	if (direction !== 'up' && direction !== 'down') {
		return redirect('/business-ideas?error=Invalid move.');
	}

	const { data: current } = await supabase
		.from('business_ideas')
		.select('id, rank')
		.eq('id', id)
		.maybeSingle();

	if (!current) {
		return redirect('/business-ideas?error=Idea not found.');
	}

	const neighborQuery = supabase
		.from('business_ideas')
		.select('id, rank')
		.order('rank', { ascending: direction === 'down' })
		.limit(1);

	const { data: neighbor } = direction === 'up'
		? await neighborQuery.lt('rank', current.rank)
		: await neighborQuery.gt('rank', current.rank);

	if (!neighbor) {
		return redirect('/business-ideas');
	}

	const [{ error: err1 }, { error: err2 }] = await Promise.all([
		supabase.from('business_ideas').update({ rank: neighbor.rank }).eq('id', current.id),
		supabase.from('business_ideas').update({ rank: current.rank }).eq('id', neighbor.id),
	]);

	if (err1 || err2) {
		return redirect(`/business-ideas?error=${encodeURIComponent((err1 || err2)!.message)}`);
	}

	return redirect('/business-ideas');
};
