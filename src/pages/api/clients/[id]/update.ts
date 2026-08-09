import type { APIRoute } from 'astro';
import { requireOwner } from '../../../../lib/auth';
import type { ClientStage } from '../../../../lib/clients';

const ALLOWED_STAGES: ClientStage[] = ['lead', 'contacted', 'negotiating', 'won', 'lost'];

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id } = params;
	const form = await request.formData();
	const stage = String(form.get('stage') ?? '') as ClientStage;
	const nextFollowUp = String(form.get('next_follow_up') ?? '').trim();

	if (!ALLOWED_STAGES.includes(stage)) {
		return redirect(`/clients/${id}?error=Invalid stage.`);
	}

	const { error } = await supabase
		.from('clients')
		.update({
			stage,
			next_follow_up: nextFollowUp || null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) {
		return redirect(`/clients/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/clients/${id}`);
};
