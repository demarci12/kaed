import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const projectId = String(form.get('project_id') ?? '').trim();
	const title = String(form.get('title') ?? '').trim();

	if (!projectId) {
		return redirect('/activities?error=Pick a project for this activity.');
	}
	if (!title) {
		return redirect('/activities?error=Activity title is required.');
	}

	const { error } = await supabase.from('challenges').insert({
		project_id: projectId,
		user_id: user.id,
		title,
	});

	if (error) {
		return redirect(`/activities?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/activities');
};
