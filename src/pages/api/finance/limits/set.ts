import type { APIRoute } from 'astro';
import { requireUser } from '../../../../lib/finance';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const auth = await requireUser(request, cookies);
	if ('redirect' in auth) {
		return redirect(auth.redirect);
	}
	const { supabase, user } = auth;

	const form = await request.formData();
	const dailyRaw = String(form.get('daily_limit') ?? '').trim();
	const weeklyRaw = String(form.get('weekly_limit') ?? '').trim();

	const dailyLimit = dailyRaw ? Number(dailyRaw) : null;
	const weeklyLimit = weeklyRaw ? Number(weeklyRaw) : null;

	if ((dailyRaw && (!Number.isFinite(dailyLimit) || dailyLimit! < 0)) ||
		(weeklyRaw && (!Number.isFinite(weeklyLimit) || weeklyLimit! < 0))) {
		return redirect('/finance?error=Limits must be zero or more.');
	}

	const { data: existing } = await supabase.from('finance_limits').select('id').limit(1).maybeSingle();

	if (existing) {
		const { error } = await supabase
			.from('finance_limits')
			.update({ daily_limit: dailyLimit, weekly_limit: weeklyLimit, updated_at: new Date().toISOString() })
			.eq('id', existing.id);
		if (error) {
			return redirect(`/finance?error=${encodeURIComponent(error.message)}`);
		}
	} else {
		const { error } = await supabase.from('finance_limits').insert({
			user_id: user.id,
			daily_limit: dailyLimit,
			weekly_limit: weeklyLimit,
		});
		if (error) {
			return redirect(`/finance?error=${encodeURIComponent(error.message)}`);
		}
	}

	return redirect('/finance');
};
