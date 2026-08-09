import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const startDate = String(form.get('start_date') ?? '').trim();
	const targetEndDate = String(form.get('target_end_date') ?? '').trim();

	if (!title) {
		return redirect('/challenges?error=Title is required.');
	}

	const { error } = await supabase.from('challenges').insert({
		user_id: user.id,
		title,
		description: description || null,
		start_date: startDate || null,
		target_end_date: targetEndDate || null,
	});

	if (error) {
		return redirect(`/challenges?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/challenges');
};
