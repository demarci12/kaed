import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../lib/system-design';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { data: requirement } = await supabase
		.from('system_requirements')
		.select('project_id')
		.eq('id', params.id)
		.maybeSingle();
	const { error } = await supabase.from('system_requirements').delete().eq('id', params.id);

	const back = requirement?.project_id ? `/system-design/${requirement.project_id}` : '/system-design';
	if (error) {
		return redirect(`${back}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(back);
};
