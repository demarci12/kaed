import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/knowledge';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { error } = await supabase.from('knowledge_cards').delete().eq('id', params.id);

	if (error) {
		return redirect(`/specific-knowledge?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/specific-knowledge');
};
