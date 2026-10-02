import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { listBanks } from '@/lib/enable-banking';

export const dynamic = 'force-dynamic';

/** Bank names Enable Banking supports in a country, for the connect form's picker. */
export async function GET(request: Request) {
	if (!(await getOwnerSession())) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
	const country = (new URL(request.url).searchParams.get('country') ?? '').toUpperCase();
	if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: 'Bad country.' }, { status: 400 });
	try {
		const { aspsps } = await listBanks(country);
		return NextResponse.json({ banks: aspsps.map((b) => b.name).sort((a, b) => a.localeCompare(b)) });
	} catch (e) {
		return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not load banks.' }, { status: 502 });
	}
}
