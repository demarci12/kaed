import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { jiraAddComment, jiraPush } from '@/lib/jira';
import { LIMITS } from '@/lib/work';

/** Adds a comment to a ticket: `{ body, jira? }`. With `jira: true` it is also posted to the ticket in Jira. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { body?: unknown; jira?: unknown } | null;
	const text = typeof body?.body === 'string' ? body.body.trim() : '';
	if (!text) return NextResponse.json({ ok: false, error: 'Write the comment first.' }, { status: 400 });
	if (text.length > LIMITS.comment) return NextResponse.json({ ok: false, error: `A comment is ${LIMITS.comment} characters at most.` }, { status: 400 });

	const { data, error } = await session.supabase
		.from('work_comments')
		.insert({ user_id: session.user.id, task_id: id, body: text, source: 'app' })
		.select('id, task_id, body, source, created_at')
		.single();
	if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not save.' }, { status: 500 });

	// Saved here first; Jira is a second step that may fail without undoing the comment.
	let jira;
	if (body?.jira === true) {
		const { data: task } = await session.supabase.from('work_tasks').select('jira_key').eq('id', id).maybeSingle();
		jira = await jiraPush(task?.jira_key, async (cfg, key) => { await jiraAddComment(cfg, key, text); return `comment posted to ${key}`; });
	}
	return NextResponse.json({ ok: true, comment: data, jira });
}
