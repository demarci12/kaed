import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const categoryId = String(form.get('category_id') ?? '').trim();
	const month = String(form.get('month') ?? '').trim();
	const amount = Number(form.get('amount'));

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!categoryId || !/^\d{4}-\d{2}-01$/.test(month)) {
		return back(`/finance/budget?error=${encodeURIComponent('Invalid budget request.')}`);
	}
	if (!Number.isFinite(amount) || amount < 0) {
		return back(`/finance/budget?month=${month}&error=${encodeURIComponent('Amount must be zero or more.')}`);
	}

	const { error } = await supabase.from('finance_budgets').upsert(
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
		return back(`/finance/budget?month=${month}&error=${encodeURIComponent(error.message)}`);
	}

	return back(`/finance/budget?month=${month}`);
}
