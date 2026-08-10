import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { error } = await supabase.from('ideas').delete().eq('id', params.id);

	if (error) {
		return redirect(`/pain-points?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/pain-points');
};
