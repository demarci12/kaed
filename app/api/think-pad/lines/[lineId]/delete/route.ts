import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { recomputeSearchText } from '@/lib/think-pad-helpers';

export async function POST(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { lineId } = await params;

	const { data: line } = await session.supabase
		.from('think_pad_entries')
		.select('page_id')
		.eq('id', lineId)
		.maybeSingle();

	const { error } = await session.supabase.from('think_pad_entries').delete().eq('id', lineId);
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
	if (line) await recomputeSearchText(session.supabase, line.page_id);
	return NextResponse.json({ ok: true });
}
