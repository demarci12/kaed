import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { cleanTask, type WorkTask } from '@/lib/work';
import { dbMessage, withStats } from '@/lib/work-server';

/** Creates a ticket row: `{ title, jira_key?, responsible?, status?, priority?, due_on?, description? }`. */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;

	const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
	if (!body) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
	const cleaned = cleanTask(body, { requireTitle: true });
	if (!cleaned.ok) return NextResponse.json({ ok: false, error: cleaned.error }, { status: 400 });

	const { data, error } = await supabase.from('work_tasks').insert({ user_id: user.id, ...cleaned.value }).select('*').single();
	if (error || !data) return NextResponse.json({ ok: false, error: error ? dbMessage(error) : 'Could not save.' }, { status: error?.code === '23505' ? 409 : 500 });

	const [task] = await withStats(supabase, [data as WorkTask]);
	return NextResponse.json({ ok: true, task });
}
