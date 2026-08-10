import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id: projectId, challengeId } = params;
	const form = await request.formData();
	const isDone = String(form.get('is_done') ?? '') === 'true';
	const returnTo = String(form.get('return_to') ?? '').trim();
	const backTo = returnTo || `/projects/${projectId}`;

	const { error } = await supabase
		.from('challenges')
		.update({ is_done: !isDone })
		.eq('id', challengeId);

	if (error) {
		return redirect(`${backTo}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(backTo);
};
