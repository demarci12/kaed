import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: challengeId } = params;
	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();

	if (!title) {
		return redirect(`/challenges/${challengeId}?error=Todo title is required.`);
	}

	const { error } = await supabase.from('challenge_todos').insert({
		challenge_id: challengeId,
		user_id: user.id,
		title,
	});

	if (error) {
		return redirect(`/challenges/${challengeId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/challenges/${challengeId}`);
};
