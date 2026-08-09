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
	const type = String(form.get('type') ?? '') as FinanceType;
	const amount = Number(form.get('amount'));
	const categoryId = String(form.get('category_id') ?? '').trim();
	const note = String(form.get('note') ?? '').trim();
	const occurredOn = String(form.get('occurred_on') ?? '').trim();

	if (!ALLOWED.includes(type)) {
		return redirect('/finance?error=Invalid transaction type.');
	}
	if (!Number.isFinite(amount) || amount <= 0) {
		return redirect('/finance?error=Amount must be a positive number.');
	}

	const { error } = await supabase.from('finance_transactions').insert({
		user_id: user.id,
		type,
		amount,
		category_id: categoryId || null,
		note: note || null,
		occurred_on: occurredOn || new Date().toISOString().slice(0, 10),
	});

	if (error) {
		return redirect(`/finance?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/finance');
};
