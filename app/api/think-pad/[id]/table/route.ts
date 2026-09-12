import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { createTable, getTableForPage } from '@/lib/think-pad-tables';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id: pageId } = await params;

	const form = await request.formData();
	if (!(await getTableForPage(session.supabase, pageId))) {
		await createTable(session.supabase, pageId, String(form.get('name') ?? 'Table'));
	}
	return NextResponse.redirect(new URL(`/think-pad/${pageId}`, request.url), { status: 303 });
}
