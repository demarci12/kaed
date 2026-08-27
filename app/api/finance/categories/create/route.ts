import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { FinanceType } from '@/lib/finance';

const ALLOWED: FinanceType[] = ['income', 'expense', 'saving'];

export async function POST(request: Request) {
	const session = await getSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const type = String(form.get('type') ?? '') as FinanceType;
	const defaultAmountRaw = String(form.get('default_amount') ?? '').trim();
	const interestRateRaw = String(form.get('interest_rate') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!name) {
		return back('/finance/settings?error=Category name is required.');
	}
	if (!ALLOWED.includes(type)) {
		return back('/finance/settings?error=Invalid category type.');
	}

	const defaultAmount = defaultAmountRaw ? Number(defaultAmountRaw) : 0;
	if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
		return back('/finance/settings?error=Default amount must be zero or more.');
	}

	const interestRate = type === 'saving' && interestRateRaw ? Number(interestRateRaw) : null;
	if (interestRate !== null && !Number.isFinite(interestRate)) {
		return back('/finance/settings?error=Interest rate must be a number.');
	}

	const { error } = await supabase.from('finance_categories').insert({
		user_id: user.id,
		name,
		type,
		default_amount: defaultAmount,
		interest_rate: interestRate,
	});

	if (error) {
		return back(`/finance/settings?error=${encodeURIComponent(error.message)}`);
	}

	return back('/finance/settings');
}
