import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { recomputeSearchText } from '@/lib/think-pad-helpers';

/**
 * Overwrites one line's text verbatim -- including an empty string, which
 * createFieldRoute can't do (its `text` kind coerces '' to null, but this
 * column is `not null`: an empty line is a real line, not "unset").
 */
export async function POST(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { lineId } = await params;

	const payload = (await request.json().catch(() => null)) as { body?: unknown } | null;
	const body = typeof payload?.body === 'string' ? payload.body : '';

	const { data: line, error } = await session.supabase
		.from('think_pad_entries')
		.update({ body, updated_at: new Date().toISOString() })
		.eq('id', lineId)
		.select('page_id')
		.single();

	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	await recomputeSearchText(session.supabase, line.page_id);
	return NextResponse.json({ ok: true });
}
