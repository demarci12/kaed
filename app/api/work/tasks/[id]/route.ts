import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { cleanTask } from '@/lib/work';
import { dbMessage } from '@/lib/work-server';

type Ctx = { params: Promise<{ id: string }> };

/** Edits any of a ticket's fields; only the fields sent are written. */
export async function POST(request: Request, { params }: Ctx) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
	const cleaned = cleanTask(body, { requireTitle: false });
	if (!cleaned.ok) return NextResponse.json({ ok: false, error: cleaned.error }, { status: 400 });
	if (!Object.keys(cleaned.value).length) return NextResponse.json({ ok: false, error: 'Nothing to save.' }, { status: 400 });

	const { data, error } = await session.supabase
		.from('work_tasks')
		.update({ ...cleaned.value, updated_at: new Date().toISOString() })
		.eq('id', id)
		.select('id, status, done_at')
		.maybeSingle();
	if (error) return NextResponse.json({ ok: false, error: dbMessage(error) }, { status: error.code === '23505' ? 409 : 500 });
	if (!data) return NextResponse.json({ ok: false, error: 'Ticket not found.' }, { status: 404 });
	return NextResponse.json({ ok: true, task: data });
}

/** What the open row needs: the description, the comments (newest first) and the time log. */
export async function GET(_request: Request, { params }: Ctx) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;
	const { supabase } = session;

	const [{ data: task }, { data: comments }, { data: logs }] = await Promise.all([
		supabase.from('work_tasks').select('description').eq('id', id).maybeSingle(),
		supabase.from('work_comments').select('id, task_id, body, source, created_at').eq('task_id', id).order('created_at', { ascending: false }),
		supabase.from('work_logs').select('id, task_id, logged_on, hours, note, source, created_at').eq('task_id', id).order('logged_on', { ascending: false }).order('created_at', { ascending: false }),
	]);
	if (!task) return NextResponse.json({ ok: false, error: 'Ticket not found.' }, { status: 404 });
	return NextResponse.json({
		ok: true,
		description: task.description ?? '',
		comments: comments ?? [],
		logs: (logs ?? []).map((l) => ({ ...l, hours: Number(l.hours) })),
	});
}
