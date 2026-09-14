import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/** Sets one line's `position` (float, used for both midpoint insertion and
 *  the move-up/move-down swap in ThinkPadDoc) -- never a plain form. */
export async function POST(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { lineId } = await params;

	const payload = (await request.json().catch(() => null)) as { position?: unknown } | null;
	const position = Number(payload?.position);
	if (!Number.isFinite(position)) {
		return NextResponse.json({ ok: false, error: 'Invalid position.' }, { status: 400 });
	}

	const { error } = await session.supabase
		.from('think_pad_entries')
		.update({ position, updated_at: new Date().toISOString() })
		.eq('id', lineId);

	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	return NextResponse.json({ ok: true });
}
