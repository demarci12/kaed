import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { newApiKey } from '@/lib/cms';

/** Issues a new API key for the site, invalidating the old one. The plaintext is returned once and never stored. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const { key, hash, prefix } = newApiKey();
	const { data, error } = await session.supabase
		.from('cms_sites')
		.update({ api_key_hash: hash, api_key_prefix: prefix, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select('id');
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	if (!data?.length) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });
	return NextResponse.json({ ok: true, key, prefix });
}
