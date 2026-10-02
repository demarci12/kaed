import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { accountRefs } from '@/lib/banking';
import { serviceClient } from '@/lib/cms';
import { createSession } from '@/lib/enable-banking';

export const dynamic = 'force-dynamic';

/**
 * Where the bank sends the browser back to, with ?code=&state= (or ?error=).
 * Exchanges the code for a session and stores the accounts it can read. It does
 * not sync: that is the "Sync now" button, so a slow bank can't stall the redirect.
 */
export async function GET(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

	const q = new URL(request.url).searchParams;
	const state = q.get('state');
	const code = q.get('code');
	const back = (qs: string) => NextResponse.redirect(new URL(`/finance/banks?${qs}`, request.url), { status: 303 });

	if (!state) return back('error=Missing state from the bank.');
	const db = serviceClient();
	const { data: conn } = await db.from('bank_connections').select('id').eq('id', state).eq('user_id', session.user.id).maybeSingle();
	if (!conn) return back('error=Unknown connection.');

	if (q.get('error') || !code) {
		const message = q.get('error_description') ?? q.get('error') ?? 'The bank did not authorise access.';
		await db.from('bank_connections').update({ status: 'error', last_error: message }).eq('id', state);
		return back(`error=${encodeURIComponent(message)}`);
	}

	try {
		const s = await createSession(code);
		await db
			.from('bank_connections')
			.update({
				status: 'active',
				session_id: s.session_id,
				accounts: accountRefs(s.accounts),
				valid_until: s.access.valid_until,
				last_error: null,
			})
			.eq('id', state);
		return back('connected=1');
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Could not finish connecting.';
		await db.from('bank_connections').update({ status: 'error', last_error: message }).eq('id', state);
		return back(`error=${encodeURIComponent(message)}`);
	}
}
