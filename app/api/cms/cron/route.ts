import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { serviceClient, type CmsSite } from '@/lib/cms';
import { runSite, type RunResult } from '@/lib/cms-run';

export const dynamic = 'force-dynamic';
// Article generation is slow (a minute or so each); give a full pass room.
export const maxDuration = 300;

/**
 * The posting machine's heartbeat. Vercel Cron calls this daily (vercel.json)
 * with `Authorization: Bearer $CRON_SECRET`; any external scheduler can too, to
 * run it more often. The signed-in owner may also call it directly.
 */
export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET;
	const bearer = request.headers.get('authorization') === `Bearer ${secret}`;
	if (!(secret && bearer) && !(await getOwnerSession())) {
		return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
	}

	// ?lookahead=<hours>: publish posts due within that window (the daily Vercel cron uses ~23).
	const lookaheadHours = Math.min(Math.max(Number(new URL(request.url).searchParams.get('lookahead')) || 0, 0), 24);
	const db = serviceClient();
	const { data: sites } = await db.from('cms_sites').select('*').eq('active', true).order('created_at');
	const results: RunResult[] = [];
	const started = Date.now();
	for (const site of (sites ?? []) as CmsSite[]) {
		// Leave headroom so one slow article can't run the whole pass past maxDuration.
		if (Date.now() - started > 200_000) {
			results.push({ site: site.slug, published: 0, generated: null, deployed: null, notes: ['Skipped: out of time, will run next pass.'] });
			continue;
		}
		results.push(await runSite(site, { db, lookaheadHours }));
	}
	return NextResponse.json({ ok: true, results });
}
