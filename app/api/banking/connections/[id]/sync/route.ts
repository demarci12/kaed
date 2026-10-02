import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { syncConnection, type BankConnection } from '@/lib/banking';
import { serviceClient } from '@/lib/cms';

export const dynamic = 'force-dynamic';
// One bank per request, so a slow one can't eat the others' time.
export const maxDuration = 60;

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

	const { id } = await ctx.params;
	const db = serviceClient();
	const { data } = await db.from('bank_connections').select('*').eq('id', id).eq('user_id', session.user.id).maybeSingle();
	if (!data) return NextResponse.json({ ok: false, error: 'Connection not found.' }, { status: 404 });

	const result = await syncConnection(db, data as BankConnection);
	return NextResponse.json({ ok: !result.error, ...result }, { status: result.error ? 502 : 200 });
}
