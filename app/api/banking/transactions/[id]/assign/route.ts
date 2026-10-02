import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { importToFinance, type BankTransaction } from '@/lib/banking';
import { serviceClient } from '@/lib/cms';

export const dynamic = 'force-dynamic';

/** Inbox row -> finance transaction in the chosen category, optionally remembering the counterparty as a rule. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const back = (error?: string) =>
		NextResponse.redirect(new URL(error ? `/finance/banks?error=${encodeURIComponent(error)}` : '/finance/banks', request.url), { status: 303 });

	const { id } = await ctx.params;
	const form = await request.formData();
	const categoryId = String(form.get('category_id') ?? '').trim();
	const hufAmount = Number(form.get('huf_amount'));
	const remember = form.get('remember') === 'on';
	if (!categoryId) return back('Pick a category.');
	if (!Number.isFinite(hufAmount) || hufAmount <= 0) return back('Amount in HUF must be a positive number.');

	const db = serviceClient();
	const [{ data: tx }, { data: category }] = await Promise.all([
		db.from('bank_transactions').select('*').eq('id', id).eq('status', 'inbox').maybeSingle(),
		db.from('finance_categories').select('id, type').eq('id', categoryId).maybeSingle(),
	]);
	if (!tx) return back('That transaction is no longer in the inbox.');
	if (!category) return back('Category not found.');

	const error = await importToFinance(db, { userId: session.user.id, tx: tx as BankTransaction, category, hufAmount });
	if (error) return back(error);

	const key = (tx as BankTransaction).counterparty_key;
	if (remember && key) {
		await db.from('bank_rules').upsert(
			{ user_id: session.user.id, counterparty_key: key, category_id: categoryId, ignore: false },
			{ onConflict: 'counterparty_key' },
		);
	}
	return back();
}
