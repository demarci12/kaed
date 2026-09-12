import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/**
 * Inserts one line at a client-computed `position` (the midpoint between its
 * new neighbours) and hands back the durable row. Called from
 * `ThinkPadDoc` -- never from a plain form -- so the response is always JSON.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

	const payload = (await request.json().catch(() => null)) as { body?: unknown; position?: unknown } | null;
	const body = typeof payload?.body === 'string' ? payload.body : '';
	const position = Number(payload?.position);
	if (!Number.isFinite(position)) {
		return NextResponse.json({ ok: false, error: 'Invalid position.' }, { status: 400 });
	}

	const { data, error } = await session.supabase
		.from('think_pad_entries')
		.insert({ user_id: session.user.id, body, position, source: 'app' })
		.select('id, body, position, source, created_at, updated_at')
		.single();

	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true, line: data });
}
