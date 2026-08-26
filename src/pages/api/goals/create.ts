import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/goals';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();

	if (!title) {
		return redirect('/goals?error=Title is required.');
	}

	const { data: maxRankRow } = await supabase
		.from('goals')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextRank = (maxRankRow?.rank ?? -1) + 1;

	const { error } = await supabase.from('goals').insert({
		user_id: user.id,
		title,
		description: description || null,
		rank: nextRank,
	});

	if (error) {
		return redirect(`/goals?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/goals');
};
