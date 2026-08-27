import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { FinanceType } from '@/lib/finance';

const ALLOWED: FinanceType[] = ['income', 'expense', 'saving'];

export async function POST(request: Request) {
	const session = await getSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const type = String(form.get('type') ?? '') as FinanceType;
	const amount = Number(form.get('amount'));
	const categoryId = String(form.get('category_id') ?? '').trim();
	const note = String(form.get('note') ?? '').trim();
	const occurredOn = String(form.get('occurred_on') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!ALLOWED.includes(type)) {
		return back('/finance?error=Invalid transaction type.');
	}
	if (!Number.isFinite(amount) || amount <= 0) {
		return back('/finance?error=Amount must be a positive number.');
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
		return back(`/finance?error=${encodeURIComponent(error.message)}`);
	}

	return back('/finance');
}
