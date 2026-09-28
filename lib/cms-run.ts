import type { SupabaseClient } from '@supabase/supabase-js';
import { fireDeployHook, nextSlot, serviceClient, slugify, type CmsIdea, type CmsPost, type CmsSite } from './cms';
import { generatePost } from './cms-generate';

/**
 * The posting machine. `runSite` does one pass for a site:
 *   1. publish every scheduled post whose time has come, and if anything went
 *      live, ask the site to rebuild (one deploy hook call per pass);
 *   2. generate the next article from the ideas queue when the pipeline of
 *      not-yet-published posts is below the site's buffer (or `force`).
 * Called by the daily cron and by "Run now" on the site page.
 */

export interface RunResult {
	site: string;
	published: number;
	generated: string | null;
	deployed: boolean | null;
	notes: string[];
}

/** Publishes due scheduled posts. Returns how many went live. */
export async function publishDue(db: SupabaseClient, site: CmsSite, lookaheadHours = 0): Promise<number> {
	const now = new Date().toISOString();
	// A once-a-day cron can't hit a slot's exact hour, so it passes a lookahead:
	// everything due within that window goes live in this pass.
	const cutoff = new Date(Date.now() + lookaheadHours * 3_600_000).toISOString();
	const { data } = await db
		.from('cms_posts')
		.update({ status: 'published', published_at: now, updated_at: now })
		.eq('site_id', site.id)
		.eq('status', 'scheduled')
		.lte('publish_at', cutoff)
		.select('id');
	return data?.length ?? 0;
}

async function uniqueSlug(db: SupabaseClient, siteId: string, base: string): Promise<string> {
	const root = slugify(base);
	const { data } = await db.from('cms_posts').select('slug').eq('site_id', siteId).like('slug', `${root}%`);
	const taken = new Set((data ?? []).map((r) => r.slug as string));
	if (!taken.has(root)) return root;
	let n = 2;
	while (taken.has(`${root}-${n}`)) n++;
	return `${root}-${n}`;
}

/** Turns the oldest queued idea into a post. Returns its title, or null if the queue is empty. */
export async function generateNext(db: SupabaseClient, site: CmsSite): Promise<string | null> {
	const { data: claimed } = await db
		.from('cms_ideas')
		.select('*')
		.eq('site_id', site.id)
		.eq('status', 'queued')
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();
	const idea = claimed as CmsIdea | null;
	if (!idea) return null;

	// Claim it first so a concurrent run (cron + a manual click) can't take the same idea.
	const { data: locked } = await db
		.from('cms_ideas')
		.update({ status: 'generating', error: null })
		.eq('id', idea.id)
		.eq('status', 'queued')
		.select('id');
	if (!locked?.length) return null;

	try {
		const [{ data: titles }, { data: upcoming }] = await Promise.all([
			db.from('cms_posts').select('title').eq('site_id', site.id).order('created_at', { ascending: false }).limit(40),
			db.from('cms_posts').select('publish_at').eq('site_id', site.id).eq('status', 'scheduled').order('publish_at', { ascending: false }).limit(1),
		]);

		const article = await generatePost(site, idea.idea, (titles ?? []).map((t) => t.title as string));
		const slug = await uniqueSlug(db, site.id, article.slug || article.title);

		let status: CmsPost['status'] = 'draft';
		let publishAt: string | null = null;
		if (site.auto_publish) {
			const lastScheduled = upcoming?.[0]?.publish_at ? new Date(upcoming[0].publish_at as string) : null;
			const after = lastScheduled && lastScheduled > new Date() ? lastScheduled : new Date();
			status = 'scheduled';
			publishAt = nextSlot(after, site.schedule_days, site.publish_hour, site.timezone).toISOString();
		}

		const { data: post, error } = await db
			.from('cms_posts')
			.insert({
				user_id: site.user_id,
				site_id: site.id,
				idea_id: idea.id,
				slug,
				title: article.title,
				description: article.description,
				excerpt: article.excerpt,
				body_md: article.body_md,
				cover_alt: article.cover_alt,
				keywords: article.keywords,
				status,
				publish_at: publishAt,
				source: 'ai',
			})
			.select('id')
			.single();
		if (error) throw new Error(error.message);

		await db.from('cms_ideas').update({ status: 'used', post_id: post.id }).eq('id', idea.id);
		return article.title;
	} catch (e) {
		await db
			.from('cms_ideas')
			.update({ status: 'failed', error: e instanceof Error ? e.message : 'Generation failed.' })
			.eq('id', idea.id);
		throw e;
	}
}

export async function runSite(site: CmsSite, opts: { force?: boolean; db?: SupabaseClient; lookaheadHours?: number } = {}): Promise<RunResult> {
	const db = opts.db ?? serviceClient();
	const result: RunResult = { site: site.slug, published: 0, generated: null, deployed: null, notes: [] };

	result.published = await publishDue(db, site, opts.lookaheadHours);

	const { count } = await db
		.from('cms_posts')
		.select('id', { count: 'exact', head: true })
		.eq('site_id', site.id)
		.in('status', ['draft', 'scheduled']);
	// Drafts only count toward the buffer when they are waiting to go out; in
	// review mode (auto_publish off) the buffer is what's awaiting approval.
	if (opts.force || (count ?? 0) < site.buffer) {
		try {
			result.generated = await generateNext(db, site);
			if (!result.generated) result.notes.push('Ideas queue is empty.');
		} catch (e) {
			result.notes.push(e instanceof Error ? e.message : 'Generation failed.');
		}
	}

	if (result.published > 0) {
		const hook = await fireDeployHook(site);
		result.deployed = hook.ok;
		if (!hook.ok && hook.error) result.notes.push(hook.error);
	}
	return result;
}
