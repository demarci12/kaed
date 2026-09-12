import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { getTableForPage, removeColumn } from '@/lib/think-pad-tables';

export async function POST(request: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id: pageId, name } = await params;

	// Next.js already URL-decodes dynamic segments, so `name` is the raw
	// column name here, not still percent-encoded.
	const table = await getTableForPage(session.supabase, pageId);
	if (table) await removeColumn(session.supabase, table, name);
	return NextResponse.redirect(new URL(`/think-pad/${pageId}`, request.url), { status: 303 });
}
