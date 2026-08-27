import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const symbol = String(form.get('symbol') ?? '').trim().toUpperCase();
	const slug = String(form.get('cmc_slug') ?? '').trim();
	const quantity = Number(form.get('quantity') ?? 0);
	const cost = Number(form.get('cost_basis_huf') ?? 0);
	const goalRaw = String(form.get('goal_price_usd') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!symbol) {
		return back('/finance/investments?error=Symbol is required.');
	}
	if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(cost) || cost < 0) {
		return back('/finance/investments?error=Quantity and invested amount must be numbers >= 0.');
	}

	const { data: last } = await supabase
		.from('investments')
		.select('sort_order')
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();

	const { error } = await supabase.from('investments').insert({
		user_id: user.id,
		symbol,
		cmc_slug: slug || null,
		quantity,
		cost_basis_huf: cost,
		goal_price_usd: goalRaw ? Number(goalRaw) : null,
		sort_order: ((last?.sort_order as number | undefined) ?? -1) + 1,
	});

	if (error) {
		return back(`/finance/investments?error=${encodeURIComponent(error.message)}`);
	}
	return back('/finance/investments');
}
