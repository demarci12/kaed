import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { serviceClient } from '@/lib/cms';

export const dynamic = 'force-dynamic';

/** For transfers between your own accounts and anything else that shouldn't count. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const back = (error?: string) =>
		NextResponse.redirect(new URL(error ? `/finance/banks?error=${encodeURIComponent(error)}` : '/finance/banks', request.url), { status: 303 });

	const { id } = await ctx.params;
	const remember = (await request.formData()).get('remember') === 'on';
	const db = serviceClient();

	const { data: tx } = await db.from('bank_transactions').select('counterparty_key').eq('id', id).eq('status', 'inbox').maybeSingle();
	if (!tx) return back('That transaction is no longer in the inbox.');

	const { error } = await db.from('bank_transactions').update({ status: 'ignored' }).eq('id', id);
	if (error) return back(error.message);

	if (remember && tx.counterparty_key) {
		await db.from('bank_rules').upsert(
			{ user_id: session.user.id, counterparty_key: tx.counterparty_key, category_id: null, ignore: true },
			{ onConflict: 'counterparty_key' },
		);
	}
	return back();
}
