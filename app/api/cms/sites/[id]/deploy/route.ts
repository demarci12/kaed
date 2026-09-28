import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { fireDeployHook } from '@/lib/cms';

/** Manually triggers the site's deploy hook (rebuild). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const { data: site } = await session.supabase.from('cms_sites').select('deploy_hook_url').eq('id', id).maybeSingle();
	if (!site) return NextResponse.json({ ok: false, error: 'Site not found.' }, { status: 404 });

	const hook = await fireDeployHook(site);
	return hook.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, error: hook.error }, { status: 502 });
}
