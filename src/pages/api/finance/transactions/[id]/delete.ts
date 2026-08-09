import type { APIRoute } from 'astro';
import { requireUser } from '../../../../../lib/finance';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { error } = await supabase.from('finance_transactions').delete().eq('id', params.id);

	if (error) {
		return redirect(`/finance?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/finance');
};
