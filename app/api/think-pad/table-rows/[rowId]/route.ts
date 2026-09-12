import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { updateRowCell } from '@/lib/think-pad-tables';

// Called via fetch (JSON) for inline cell editing -- never a plain form.
export async function POST(request: Request, { params }: { params: Promise<{ rowId: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { rowId } = await params;

	const body = (await request.json().catch(() => null)) as { column?: unknown; value?: unknown } | null;
	if (typeof body?.column !== 'string') {
		return NextResponse.json({ ok: false, error: 'column is required.' }, { status: 400 });
	}

	const { data: row } = await session.supabase
		.from('think_pad_table_rows')
		.select('table_id')
		.eq('id', rowId)
		.maybeSingle();
	if (!row) return NextResponse.json({ ok: false, error: 'Row not found.' }, { status: 404 });
	const { data: table } = await session.supabase
		.from('think_pad_tables')
		.select('page_id')
		.eq('id', row.table_id)
		.maybeSingle();
	const pageId = table?.page_id;
	if (!pageId) return NextResponse.json({ ok: false, error: 'Table not found.' }, { status: 404 });

	const value = typeof body.value === 'string' ? body.value : String(body.value ?? '');
	const { error } = await updateRowCell(session.supabase, pageId, rowId, body.column, value);
	if (error) return NextResponse.json({ ok: false, error }, { status: 400 });
	return NextResponse.json({ ok: true });
}
