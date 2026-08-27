import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../../lib/investments';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}

	const { error } = await auth.supabase.from('investments').delete().eq('id', params.id);

	if (error) {
		return redirect(`/finance/investments?error=${encodeURIComponent(error.message)}`);
	}
	return redirect('/finance/investments');
};
