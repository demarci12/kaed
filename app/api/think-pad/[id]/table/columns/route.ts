import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { addColumn, getTableForPage } from '@/lib/think-pad-tables';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id: pageId } = await params;

	const form = await request.formData();
	const table = await getTableForPage(session.supabase, pageId);
	if (table) {
		const { error } = await addColumn(session.supabase, table, {
			name: String(form.get('name') ?? ''),
			type: String(form.get('type') ?? ''),
			options: String(form.get('options') ?? ''),
		});
		if (error) {
			return NextResponse.redirect(
				new URL(`/think-pad/${pageId}?error=${encodeURIComponent(error)}`, request.url),
				{ status: 303 },
			);
		}
	}
	return NextResponse.redirect(new URL(`/think-pad/${pageId}`, request.url), { status: 303 });
}
