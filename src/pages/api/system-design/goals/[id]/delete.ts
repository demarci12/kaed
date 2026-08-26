import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../lib/system-design';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { data: goal } = await supabase.from('system_goals').select('project_id').eq('id', params.id).maybeSingle();
	const { error } = await supabase.from('system_goals').delete().eq('id', params.id);

	const back = goal?.project_id ? `/system-design/${goal.project_id}` : '/system-design';
	if (error) {
		return redirect(`${back}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(back);
};
