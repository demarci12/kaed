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
	const preconditions = String(form.get('preconditions') ?? '').trim();
	const mainFlow = String(form.get('main_flow') ?? '').trim();
	const postconditions = String(form.get('postconditions') ?? '').trim();
	const actorId = String(form.get('actor_id') ?? '').trim();

	if (!projectId) {
		return redirect('/system-design?error=Missing project.');
	}
	if (!title) {
		return redirect(`/system-design/${projectId}?error=Title is required.`);
	}

	const { error } = await supabase.from('system_use_cases').insert({
		project_id: projectId,
		user_id: user.id,
		actor_id: actorId || null,
		title,
		description: description || null,
		preconditions: preconditions || null,
		main_flow: mainFlow || null,
		postconditions: postconditions || null,
	});

	if (error) {
		return redirect(`/system-design/${projectId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/system-design/${projectId}`);
};
