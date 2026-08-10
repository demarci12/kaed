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
	const defaultAmountRaw = String(form.get('default_amount') ?? '').trim();
	const interestRateRaw = String(form.get('interest_rate') ?? '').trim();

	if (!name) {
		return redirect('/finance/settings?error=Category name is required.');
	}
	if (!ALLOWED.includes(type)) {
		return redirect('/finance/settings?error=Invalid category type.');
	}

	const defaultAmount = defaultAmountRaw ? Number(defaultAmountRaw) : 0;
	if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
		return redirect('/finance/settings?error=Default amount must be zero or more.');
	}

	const interestRate = type === 'saving' && interestRateRaw ? Number(interestRateRaw) : null;
	if (interestRate !== null && !Number.isFinite(interestRate)) {
		return redirect('/finance/settings?error=Interest rate must be a number.');
	}

	const { error } = await supabase.from('finance_categories').insert({
		user_id: user.id,
		name,
		type,
		default_amount: defaultAmount,
		interest_rate: interestRate,
	});

	if (error) {
		return redirect(`/finance/settings?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/finance/settings');
};
