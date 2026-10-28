import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { cleanTask, LIMITS, type WorkTask } from '@/lib/work';
import { dbMessage, withStats } from '@/lib/work-server';

const MAX_ROWS = 500;

/**
 * Pastes in rows from Jira or Excel: `{ rows: ImportRow[] }`. A row whose Jira
 * key is already on the list updates that ticket; any other row is a new one
 * (its comment, if any, becomes the first comment).
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;

	const body = (await request.json().catch(() => null)) as { rows?: unknown } | null;
	if (!Array.isArray(body?.rows)) return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });

	type Parsed = { values: Record<string, unknown>; comment: string | null };
	const parsed: Parsed[] = [];
	let skipped = 0;
	for (const raw of (body.rows as Record<string, unknown>[]).slice(0, MAX_ROWS)) {
		const cleaned = cleanTask(raw, { requireTitle: true });
		if (!cleaned.ok) { skipped++; continue; }
		const comment = typeof raw.comment === 'string' ? raw.comment.trim().slice(0, LIMITS.comment) : '';
		parsed.push({ values: cleaned.value, comment: comment || null });
	}

	// Same Jira key twice in one paste: the later row wins.
	const byKey = new Map<string, Parsed>();
	const keyless: Parsed[] = [];
	for (const p of parsed) {
		const key = p.values.jira_key as string | null | undefined;
		if (key) byKey.set(key, p); else keyless.push(p);
	}

	const keys = [...byKey.keys()];
	const existing = new Map<string, string>();
	if (keys.length) {
		const { data } = await supabase.from('work_tasks').select('id, jira_key').in('jira_key', keys);
		for (const r of data ?? []) existing.set(r.jira_key as string, r.id as string);
	}

	const touched: string[] = [];
	let updated = 0;
	for (const [key, p] of byKey) {
		const id = existing.get(key);
		if (!id) continue;
		const { error } = await supabase.from('work_tasks').update({ ...p.values, updated_at: new Date().toISOString() }).eq('id', id);
		if (error) return NextResponse.json({ ok: false, error: dbMessage(error) }, { status: 500 });
		touched.push(id);
		updated++;
	}

	const fresh = [...[...byKey].filter(([k]) => !existing.has(k)).map(([, p]) => p), ...keyless];
	let created = 0;
	if (fresh.length) {
		const { data, error } = await supabase.from('work_tasks').insert(fresh.map((p) => ({ user_id: user.id, ...p.values }))).select('id');
		if (error || !data) return NextResponse.json({ ok: false, error: error ? dbMessage(error) : 'Could not save.' }, { status: 500 });
		const comments = data.flatMap((row, i) => (fresh[i]?.comment ? [{ user_id: user.id, task_id: row.id as string, body: fresh[i].comment as string, source: 'import' }] : []));
		if (comments.length) await supabase.from('work_comments').insert(comments);
		touched.push(...data.map((r) => r.id as string));
		created = data.length;
	}

	const { data: rows } = touched.length ? await supabase.from('work_tasks').select('*').in('id', touched.slice(0, 100)) : { data: [] };
	const tasks = await withStats(supabase, (rows ?? []) as WorkTask[]);
	// Past 100 rows the list would not fit in a URL; the page reloads its own data instead.
	return NextResponse.json({ ok: true, created, updated, skipped, tasks, reload: touched.length > 100 });
}
