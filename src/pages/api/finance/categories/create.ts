import type { APIRoute } from 'astro';
import { requireUser, type FinanceType } from '../../../../lib/finance';

const ALLOWED: FinanceType[] = ['income', 'expense', 'saving'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const type = String(form.get('type') ?? '') as FinanceType;

	if (!name) {
		return redirect('/finance?error=Category name is required.');
	}
	if (!ALLOWED.includes(type)) {
		return redirect('/finance?error=Invalid category type.');
	}

	const { error } = await supabase.from('finance_categories').insert({
		user_id: user.id,
		name,
		type,
	});

	if (error) {
		return redirect(`/finance?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/finance');
};
