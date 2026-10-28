import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { JiraError, jiraConfig, jiraMyself } from '@/lib/jira';

/** "Test connection": is Jira set up, can Vercel reach it, and whose token is it? */
export async function GET() {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });

	const cfg = jiraConfig();
	if (!cfg) return NextResponse.json({ ok: true, configured: false });
	try {
		const me = await jiraMyself(cfg);
		return NextResponse.json({ ok: true, configured: true, reachable: true, host: cfg.host, user: me.name });
	} catch (e) {
		return NextResponse.json({ ok: true, configured: true, reachable: false, host: cfg.host, error: e instanceof JiraError ? e.message : 'Could not reach Jira.' });
	}
}
