import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, params }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase } = auth;

	const { id } = params;
	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const painPoint = String(form.get('pain_point') ?? '').trim();
	const targetMarket = String(form.get('target_market') ?? '').trim();
	const validation = String(form.get('validation') ?? '').trim();

	if (!title) {
		return redirect(`/business-ideas/${id}?error=Title is required.`);
	}

	const { error } = await supabase
		.from('business_ideas')
		.update({
			title,
			pain_point: painPoint || null,
			target_market: targetMarket || null,
			validation: validation || null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) {
		return redirect(`/business-ideas/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/business-ideas/${id}`);
};
