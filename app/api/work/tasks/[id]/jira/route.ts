import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { JiraError, jiraConfig, jiraGetIssue } from '@/lib/jira';
import { LIMITS } from '@/lib/work';

/** READ from Jira: pulls the ticket's title and description into this row. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;
	const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });

	const { data: task } = await session.supabase.from('work_tasks').select('jira_key').eq('id', id).maybeSingle();
	if (!task) return fail('Ticket not found.', 404);
	if (!task.jira_key) return fail('This row has no Jira key to read from.', 400);
	const cfg = jiraConfig();
	if (!cfg) return fail('Jira is not connected yet (the JIRA_* settings are missing).', 400);

	try {
		const issue = await jiraGetIssue(cfg, task.jira_key);
		const title = issue.title.slice(0, LIMITS.title);
		const description = issue.description.slice(0, LIMITS.description) || null;
		const { error } = await session.supabase
			.from('work_tasks')
			.update({ ...(title ? { title } : {}), description, updated_at: new Date().toISOString() })
			.eq('id', id);
		if (error) return fail(error.message, 500);
		return NextResponse.json({ ok: true, title: title || null, description: description ?? '' });
	} catch (e) {
		return fail(e instanceof JiraError ? e.message : 'Could not read from Jira.', 502);
	}
}
