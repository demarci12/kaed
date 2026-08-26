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
	const name = String(form.get('name') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();
	const kind = String(form.get('kind') ?? 'primary');

	if (!projectId) {
		return redirect('/system-design?error=Missing project.');
	}
	if (!name) {
		return redirect(`/system-design/${projectId}?error=Name is required.`);
	}

	const { error } = await supabase.from('system_actors').insert({
		project_id: projectId,
		user_id: user.id,
		name,
		description: description || null,
		kind,
	});

	if (error) {
		return redirect(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/system-design/${projectId}`);
};
