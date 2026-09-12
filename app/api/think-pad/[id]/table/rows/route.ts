import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { addRow, getTableForPage } from '@/lib/think-pad-tables';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id: pageId } = await params;

	const table = await getTableForPage(session.supabase, pageId);
	if (table) await addRow(session.supabase, table.id);
	return NextResponse.redirect(new URL(`/think-pad/${pageId}`, request.url), { status: 303 });
}
