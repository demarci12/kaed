import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const body = String(form.get('body') ?? '').trim();
	const positionX = Number(form.get('position_x'));
	const positionY = Number(form.get('position_y'));

	if (!title) {
		return redirect('/brainstorm?error=Title is required.');
	}

	const { error } = await supabase.from('ideas').insert({
		user_id: user.id,
		title,
		body: body || null,
		...(Number.isFinite(positionX) && Number.isFinite(positionY)
			? { position_x: Math.round(positionX), position_y: Math.round(positionY) }
			: {}),
	});

	if (error) {
		return redirect(`/brainstorm?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/brainstorm');
};
