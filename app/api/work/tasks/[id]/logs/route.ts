import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { jiraLogWork, jiraPush } from '@/lib/jira';
import { formatHours, LIMITS, parseHours, todayInBudapest } from '@/lib/work';

/** Logs time against a ticket: `{ hours, logged_on?, note?, jira? }`. With `jira: true` the time is also logged on the Jira ticket. Hours may be "1.5", "90m" or "1h30". */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { hours?: unknown; logged_on?: unknown; note?: unknown; jira?: unknown } | null;
	const hours = parseHours(body?.hours);
	if (hours === null) return NextResponse.json({ ok: false, error: 'Hours look like 1.5, 90m or 1h30 (up to 24).' }, { status: 400 });
	const day = typeof body?.logged_on === 'string' && body.logged_on ? body.logged_on : todayInBudapest();
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) return NextResponse.json({ ok: false, error: 'A date looks like 2026-10-28.' }, { status: 400 });
	const note = typeof body?.note === 'string' ? body.note.trim() : '';
	if (note.length > LIMITS.note) return NextResponse.json({ ok: false, error: `A note is ${LIMITS.note} characters at most.` }, { status: 400 });

	const { data, error } = await session.supabase
		.from('work_logs')
		.insert({ user_id: session.user.id, task_id: id, logged_on: day, hours, note: note || null, source: 'app' })
		.select('id, task_id, logged_on, hours, note, source, created_at')
		.single();
	if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? 'Could not save.' }, { status: 500 });

	let jira;
	if (body?.jira === true) {
		const { data: task } = await session.supabase.from('work_tasks').select('jira_key').eq('id', id).maybeSingle();
		jira = await jiraPush(task?.jira_key, async (cfg, key) => { await jiraLogWork(cfg, key, hours, day, note || null); return `${formatHours(hours)} logged on ${key}`; });
	}
	return NextResponse.json({ ok: true, log: { ...data, hours: Number(data.hours) }, jira });
}
