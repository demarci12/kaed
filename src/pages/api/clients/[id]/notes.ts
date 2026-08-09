import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const { id: clientId } = params;
	const form = await request.formData();
	const note = String(form.get('note') ?? '').trim();

	if (!note) {
		return redirect(`/clients/${clientId}?error=Note text is required.`);
	}

	const { error } = await supabase.from('client_notes').insert({
		client_id: clientId,
		user_id: user.id,
		note,
	});

	if (error) {
		return redirect(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/clients/${clientId}`);
};
