import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { deleteRow } from '@/lib/think-pad-tables';

export async function POST(request: Request, { params }: { params: Promise<{ rowId: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { rowId } = await params;

	const { data: row } = await session.supabase
		.from('think_pad_table_rows')
		.select('table_id')
		.eq('id', rowId)
		.maybeSingle();
	if (!row) return NextResponse.json({ ok: true }); // already gone

	const { data: table } = await session.supabase
		.from('think_pad_tables')
		.select('page_id')
		.eq('id', row.table_id)
		.maybeSingle();

	await deleteRow(session.supabase, table?.page_id ?? '', rowId);
	return NextResponse.json({ ok: true });
}
