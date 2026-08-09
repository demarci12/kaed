import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const body = String(form.get('body') ?? '').trim();

	if (!title) {
		return redirect('/brainstorm?error=Title is required.');
	}

	const { error } = await supabase.from('ideas').insert({
		user_id: user.id,
		title,
		body: body || null,
	});

	if (error) {
		return redirect(`/brainstorm?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/brainstorm');
};
