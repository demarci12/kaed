import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/system-design';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const projectId = String(form.get('project_id') ?? '');
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();

	if (!projectId) {
		return redirect('/system-design?error=Missing project.');
	}
	if (!title) {
		return redirect(`/system-design/${projectId}?error=Title is required.`);
	}

	const { error } = await supabase.from('system_goals').insert({
		project_id: projectId,
		user_id: user.id,
		title,
		description: description || null,
	});

	if (error) {
		return redirect(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/system-design/${projectId}`);
};
