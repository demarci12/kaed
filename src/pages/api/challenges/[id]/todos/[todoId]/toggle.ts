import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id: challengeId, todoId } = params;
	const form = await request.formData();
	const isDone = String(form.get('is_done') ?? '') === 'true';

	const { error } = await supabase
		.from('challenge_todos')
		.update({ is_done: !isDone })
		.eq('id', todoId);

	if (error) {
		return redirect(`/challenges/${challengeId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/challenges/${challengeId}`);
};
