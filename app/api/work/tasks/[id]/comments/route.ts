import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { LIMITS } from '@/lib/work';

/** Adds a comment to a ticket: `{ body }`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { body?: unknown } | null;
	const text = typeof body?.body === 'string' ? body.body.trim() : '';
	if (!text) return NextResponse.json({ ok: false, error: 'Write the comment first.' }, { status: 400 });
	if (text.length > LIMITS.comment) return NextResponse.json({ ok: false, error: `A comment is ${LIMITS.comment} characters at most.` }, { status: 400 });

	const { data, error } = await session.supabase
		.from('work_comments')
		.insert({ user_id: session.user.id, task_id: id, body: text, source: 'app' })
		.select('id, task_id, body, source, created_at')
		.single();
	if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not save.' }, { status: 500 });
	return NextResponse.json({ ok: true, comment: data });
}
