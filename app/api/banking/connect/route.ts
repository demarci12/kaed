import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { serviceClient } from '@/lib/cms';
import { listBanks, startAuth } from '@/lib/enable-banking';

export const dynamic = 'force-dynamic';

const DAY_MS = 86_400_000;
/** Ask for 90 days unless the bank allows less; banks reject longer than their own cap. */
const DEFAULT_CONSENT_DAYS = 90;

/**
 * Starts bank consent: creates (or, for a reconnect, reuses) a bank_connections
 * row, asks Enable Banking for the bank's login URL, and sends the browser
 * there. The row id travels as `state`, so the callback can find it again.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

	const back = (error: string) => NextResponse.redirect(new URL(`/finance/banks?error=${encodeURIComponent(error)}`, request.url), { status: 303 });

	const form = await request.formData();
	const bank = String(form.get('bank') ?? '').trim();
	const country = String(form.get('country') ?? '').trim().toUpperCase();
	const reconnectId = String(form.get('connection_id') ?? '').trim();
	if (!bank || !/^[A-Z]{2}$/.test(country)) return back('Choose a country and a bank.');

	const db = serviceClient();
	try {
		const { aspsps } = await listBanks(country);
		const aspsp = aspsps.find((b) => b.name === bank);
		if (!aspsp) return back(`${bank} is not available in ${country}.`);
		const days = Math.min(DEFAULT_CONSENT_DAYS, Math.floor((aspsp.maximum_consent_validity ?? DEFAULT_CONSENT_DAYS * 86_400) / 86_400));

		let connectionId = reconnectId;
		if (connectionId) {
			const { error } = await db.from('bank_connections').update({ status: 'pending', last_error: null }).eq('id', connectionId).eq('user_id', session.user.id);
			if (error) return back(error.message);
		} else {
			const { data, error } = await db
				.from('bank_connections')
				.insert({ user_id: session.user.id, bank_name: bank, country })
				.select('id')
				.single();
			if (error || !data) return back(error?.message ?? 'Could not start the connection.');
			connectionId = data.id as string;
		}

		const redirectUrl = process.env.BANKING_REDIRECT_URL ?? new URL('/api/banking/callback', request.url).toString();
		const { url } = await startAuth({
			bank,
			country,
			state: connectionId,
			redirectUrl,
			validUntil: new Date(Date.now() + days * DAY_MS),
		});
		return NextResponse.redirect(url, { status: 303 });
	} catch (e) {
		return back(e instanceof Error ? e.message : 'Could not reach Enable Banking.');
	}
}
