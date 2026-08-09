import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';
import type { ClientStage } from '../../../lib/clients';

const ALLOWED_STAGES: ClientStage[] = ['lead', 'contacted', 'negotiating', 'won', 'lost'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const company = String(form.get('company') ?? '').trim();
	const email = String(form.get('email') ?? '').trim();
	const phone = String(form.get('phone') ?? '').trim();
	const stage = String(form.get('stage') ?? 'lead') as ClientStage;
	const nextFollowUp = String(form.get('next_follow_up') ?? '').trim();

	if (!name) {
		return redirect('/clients?error=Name is required.');
	}
	if (!ALLOWED_STAGES.includes(stage)) {
		return redirect('/clients?error=Invalid stage.');
	}

	const { error } = await supabase.from('clients').insert({
		user_id: user.id,
		name,
		company: company || null,
		email: email || null,
		phone: phone || null,
		stage,
		next_follow_up: nextFollowUp || null,
	});

	if (error) {
		return redirect(`/clients?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/clients');
};
