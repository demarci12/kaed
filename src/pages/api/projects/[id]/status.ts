import type { APIRoute } from 'astro';
import { requireUser, type ProjectStatus } from '../../../../lib/projects';

const ALLOWED: ProjectStatus[] = ['not_started', 'active', 'done'];

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id } = params;
	const form = await request.formData();
	const status = String(form.get('status') ?? '') as ProjectStatus;

	if (!ALLOWED.includes(status)) {
		return redirect(`/projects/${id}?error=Invalid status.`);
	}

	const { error } = await supabase
		.from('projects')
		.update({ status, updated_at: new Date().toISOString() })
		.eq('id', id);

	if (error) {
		return redirect(`/projects/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/projects/${id}`);
};
