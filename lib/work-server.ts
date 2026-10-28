import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkTask, WorkTaskRow } from './work';

type Stats = { task_id: string; comment_count: number; last_comment: string | null; last_comment_at: string | null; hours: number | string };

/**
 * Tasks plus what their comments and time log add up to. The sums come from the
 * `work_task_stats` view (one row per task, security_invoker so RLS applies),
 * not from fetching every comment: PostgREST caps a response at 1000 rows.
 */
export async function withStats(supabase: SupabaseClient, tasks: WorkTask[]): Promise<WorkTaskRow[]> {
	if (!tasks.length) return [];
	// A long `in (...)` would overflow the URL; for a big list ask for everything (RLS scopes it).
	let q = supabase.from('work_task_stats').select('*');
	if (tasks.length <= 100) q = q.in('task_id', tasks.map((t) => t.id));
	const { data } = await q;
	const byTask = new Map(((data ?? []) as Stats[]).map((s) => [s.task_id, s]));
	return tasks.map((t) => {
		const s = byTask.get(t.id);
		return {
			...t,
			comment_count: Number(s?.comment_count ?? 0),
			last_comment: s?.last_comment ?? null,
			last_comment_at: s?.last_comment_at ?? null,
			hours: Number(s?.hours ?? 0),
		};
	});
}

/** A Postgres unique violation on the Jira key, as a sentence. */
export function dbMessage(error: { code?: string; message: string }): string {
	return error.code === '23505' ? 'That Jira key is already on another row.' : error.message;
}
