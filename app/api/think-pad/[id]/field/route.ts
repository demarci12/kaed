import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { rewriteWikiLinks } from '@/lib/think-pad-helpers';

/**
 * Not `createFieldRoute` (lib/field-route.ts): renaming a page has to look up
 * the *old* title first so it can rewrite [[OldTitle]] elsewhere, and the
 * generic factory has nowhere to hook that in before the write happens.
 * Only `title` is editable this way -- a page's body lives in its lines.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { field?: unknown; value?: unknown } | null;
	if (body?.field !== 'title') {
		return NextResponse.json({ ok: false, error: 'Field is not editable.' }, { status: 400 });
	}
	const nextTitle = typeof body.value === 'string' ? body.value.trim() : '';
	if (!nextTitle) return NextResponse.json({ ok: false, error: 'Title cannot be empty.' }, { status: 400 });

	const { data: current } = await supabase.from('think_pad_pages').select('title').eq('id', id).maybeSingle();
	if (!current) return NextResponse.json({ ok: false, error: 'Page not found.' }, { status: 404 });

	const { error } = await supabase
		.from('think_pad_pages')
		.update({ title: nextTitle, updated_at: new Date().toISOString() })
		.eq('id', id);
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

	if (current.title !== nextTitle) {
		await rewriteWikiLinks(supabase, user.id, current.title, nextTitle, id);
	}

	return NextResponse.json({ ok: true });
}
