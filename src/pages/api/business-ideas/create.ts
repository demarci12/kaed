import type { APIRoute } from 'astro';
import { requireOwner } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireOwner(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const painPoint = String(form.get('pain_point') ?? '').trim();
	const targetMarket = String(form.get('target_market') ?? '').trim();
	const validation = String(form.get('validation') ?? '').trim();

	if (!title) {
		return redirect('/business-ideas?error=Title is required.');
	}

	const { error } = await supabase.from('business_ideas').insert({
		user_id: user.id,
		title,
		pain_point: painPoint || null,
		target_market: targetMarket || null,
		validation: validation || null,
	});

	if (error) {
		return redirect(`/business-ideas?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/business-ideas');
};
