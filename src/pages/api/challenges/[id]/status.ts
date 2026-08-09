import type { APIRoute } from 'astro';
import { requireUser, type ChallengeStatus } from '../../../../lib/challenges';

const ALLOWED: ChallengeStatus[] = ['not_started', 'active', 'done'];

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id } = params;
	const form = await request.formData();
	const status = String(form.get('status') ?? '') as ChallengeStatus;

	if (!ALLOWED.includes(status)) {
		return redirect(`/challenges/${id}?error=Invalid status.`);
	}

	const { error } = await supabase
		.from('challenges')
		.update({ status, updated_at: new Date().toISOString() })
		.eq('id', id);

	if (error) {
		return redirect(`/challenges/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/challenges/${id}`);
};
