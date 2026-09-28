import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { serviceClient, type CmsSite } from '@/lib/cms';
import { runSite } from '@/lib/cms-run';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** "Run now": one posting-machine pass for this site, generating the next article even if the buffer is full. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const { data: site } = await session.supabase.from('cms_sites').select('*').eq('id', id).maybeSingle();
	if (!site) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });

	const result = await runSite(site as CmsSite, { force: true, db: serviceClient() });
	return NextResponse.json({ ok: true, result });
}
