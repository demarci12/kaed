import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/finance';

function parseOptionalAmount(raw: FormDataEntryValue | null): number | null {
	const trimmed = String(raw ?? '').trim();
	if (!trimmed) return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const startingBalanceRaw = String(form.get('starting_savings_balance') ?? '0').trim();
	const startingBalance = Number(startingBalanceRaw || '0');
	const dailyLimit = parseOptionalAmount(form.get('daily_limit'));
	const weeklyLimit = parseOptionalAmount(form.get('weekly_limit'));

	if (!Number.isFinite(startingBalance)) {
		return redirect(`/finance/settings?error=${encodeURIComponent('Starting balance must be a number.')}`);
	}

	const { data: existing } = await supabase.from('finance_limits').select('id').limit(1).maybeSingle();

	const values = {
		user_id: user.id,
		starting_savings_balance: startingBalance,
		daily_limit: dailyLimit,
		weekly_limit: weeklyLimit,
		updated_at: new Date().toISOString(),
	};

	const { error } = existing
		? await supabase.from('finance_limits').update(values).eq('id', existing.id)
		: await supabase.from('finance_limits').insert(values);

	if (error) {
		return redirect(`/finance/settings?error=${encodeURIComponent(error.message)}`);
	}

	return redirect('/finance/settings');
};
