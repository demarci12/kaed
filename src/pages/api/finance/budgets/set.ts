import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/finance';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const categoryId = String(form.get('category_id') ?? '').trim();
	const month = String(form.get('month') ?? '').trim();
	const amount = Number(form.get('amount'));

	if (!categoryId || !/^\d{4}-\d{2}-01$/.test(month)) {
		return redirect(`/finance/budget?error=${encodeURIComponent('Invalid budget request.')}`);
	}
	if (!Number.isFinite(amount) || amount < 0) {
		return redirect(`/finance/budget?month=${month}&error=${encodeURIComponent('Amount must be zero or more.')}`);
	}

	const { error } = await supabase
		.from('finance_budgets')
		.upsert(
			{
				user_id: user.id,
				category_id: categoryId,
				month,
				amount,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'category_id,month' },
		);

	if (error) {
		return redirect(`/finance/budget?month=${month}&error=${encodeURIComponent(error.message)}`);
	}

	return redirect(`/finance/budget?month=${month}`);
};
