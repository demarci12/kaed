import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/challenges';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: projectId } = params;
	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();

	if (!title) {
		return redirect(`/projects/${projectId}?error=Challenge title is required.`);
	}

	const { error } = await supabase.from('challenges').insert({
		project_id: projectId,
		user_id: user.id,
		title,
	});

	if (error) {
		return redirect(`/projects/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/projects/${projectId}`);
};
