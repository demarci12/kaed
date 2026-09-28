import type { SupabaseClient } from '@supabase/supabase-js';
import { fireDeployHook, slugify, type CmsPost, type CmsSite } from './cms';
import { runSite } from './cms-run';

// Blog CMS tools for the remote MCP endpoint (app/api/mcp/route.ts): lets a
// chat session feed ideas, write and publish posts, and run the posting machine.
// Server-only. The local stdio server (mcp-server/) is a standalone script and
// only gets raw table access to the cms_* tables, not these.

const siteProp = { type: 'string', description: 'Site slug, domain or name, e.g. "kazanszerelok" or "kazanszerelok.hu".' };

export const CMS_TOOLS = [
	{
		name: 'cms_list_sites',
		description: 'List the blog CMS sites (kazanszerelok, temptech, jobro, klimaepito, …) with their posting schedule, mode and counts of posts and queued ideas.',
		inputSchema: { type: 'object', properties: {} },
	},
	{
		name: 'cms_add_ideas',
		description: 'Add article ideas to a site\'s queue. The posting machine writes one SEO article per idea, oldest first. Each idea is a topic, question or keyword brief; write them in the site\'s language.',
		inputSchema: {
			type: 'object',
			properties: { site: siteProp, ideas: { type: 'array', items: { type: 'string' }, description: 'One string per article idea.' } },
			required: ['site', 'ideas'],
		},
	},
	{
		name: 'cms_list_posts',
		description: 'List a site\'s posts (title, slug, status, go-live time), newest first, without their bodies.',
		inputSchema: {
			type: 'object',
			properties: { site: siteProp, status: { type: 'string', enum: ['draft', 'scheduled', 'published'] }, limit: { type: 'number', default: 30 } },
			required: ['site'],
		},
	},
	{
		name: 'cms_get_post',
		description: 'Get one post in full, including its Markdown body.',
		inputSchema: { type: 'object', properties: { site: siteProp, slug: { type: 'string' } }, required: ['site', 'slug'] },
	},
	{
		name: 'cms_create_post',
		description: 'Create a post yourself (Markdown body, starting at ## headings, no H1). `when` = "draft" (default), "now" (publish immediately and rebuild the site), or an ISO 8601 datetime with timezone to schedule it.',
		inputSchema: {
			type: 'object',
			properties: {
				site: siteProp,
				title: { type: 'string' },
				body_md: { type: 'string' },
				slug: { type: 'string', description: 'Optional; derived from the title otherwise.' },
				description: { type: 'string', description: 'Meta description, ~150 characters.' },
				excerpt: { type: 'string' },
				keywords: { type: 'array', items: { type: 'string' } },
				cover_image_url: { type: 'string' },
				cover_alt: { type: 'string' },
				when: { type: 'string', description: '"draft", "now", or an ISO datetime.' },
			},
			required: ['site', 'title', 'body_md'],
		},
	},
	{
		name: 'cms_set_post_status',
		description: 'Publish a post now ("publish"), schedule it ("schedule" + publish_at ISO datetime), or take it back to draft ("draft"; if it was live the site is rebuilt to remove it).',
		inputSchema: {
			type: 'object',
			properties: {
				site: siteProp,
				slug: { type: 'string' },
				action: { type: 'string', enum: ['publish', 'schedule', 'draft'] },
				publish_at: { type: 'string', description: 'ISO 8601 datetime with timezone, for "schedule".' },
			},
			required: ['site', 'slug', 'action'],
		},
	},
	{
		name: 'cms_write_next_post',
		description: 'Run the posting machine for a site right now: publish anything due and write the next article from the ideas queue. Slow — takes about a minute.',
		inputSchema: { type: 'object', properties: { site: siteProp }, required: ['site'] },
	},
	{
		name: 'cms_rebuild_site',
		description: 'Trigger the site\'s deploy hook so it rebuilds and picks up published posts.',
		inputSchema: { type: 'object', properties: { site: siteProp }, required: ['site'] },
	},
] as const;

export const CMS_TOOL_NAMES: string[] = CMS_TOOLS.map((t) => t.name);

export interface CmsToolArgs {
	site?: string;
	ideas?: string[];
	status?: string;
	limit?: number;
	slug?: string;
	title?: string;
	body_md?: string;
	description?: string;
	excerpt?: string;
	keywords?: string[];
	cover_image_url?: string;
	cover_alt?: string;
	when?: string;
	action?: string;
	publish_at?: string;
}

async function findSite(db: SupabaseClient, ref: string | undefined): Promise<CmsSite> {
	const q = (ref ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
	if (!q) throw new Error('site is required.');
	const { data } = await db.from('cms_sites').select('*');
	const sites = (data ?? []) as CmsSite[];
	const hit = sites.find((s) => [s.slug, s.domain, s.name].some((v) => v && v.toLowerCase() === q))
		?? sites.find((s) => s.domain && (q.endsWith(s.domain.toLowerCase()) || s.domain.toLowerCase().startsWith(q.replace(/\.(hu|com)$/, ''))));
	if (!hit) throw new Error(`Unknown site "${ref}". Known: ${sites.map((s) => s.slug).join(', ')}`);
	return hit;
}

async function findPost(db: SupabaseClient, siteId: string, slug: string | undefined): Promise<CmsPost> {
	if (!slug) throw new Error('slug is required.');
	const { data } = await db.from('cms_posts').select('*').eq('site_id', siteId).eq('slug', slug).maybeSingle();
	if (!data) throw new Error(`No post "${slug}" on this site.`);
	return data as CmsPost;
}

async function freeSlug(db: SupabaseClient, siteId: string, base: string) {
	const root = slugify(base);
	const { data } = await db.from('cms_posts').select('slug').eq('site_id', siteId).like('slug', `${root}%`);
	const taken = new Set((data ?? []).map((r) => r.slug as string));
	let slug = root;
	for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
	return slug;
}

function parseWhen(value: string | undefined): { status: CmsPost['status']; at: Date | null } {
	const v = (value ?? 'draft').trim();
	if (v === 'draft') return { status: 'draft', at: null };
	if (v === 'now') return { status: 'published', at: new Date() };
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) throw new Error('`when` must be "draft", "now" or an ISO 8601 datetime.');
	return d > new Date() ? { status: 'scheduled', at: d } : { status: 'published', at: new Date() };
}

/** Handles a cms_* tool call. Returns plain data; the caller wraps it in an MCP result. */
export async function callCmsTool(db: SupabaseClient, name: string, args: CmsToolArgs): Promise<unknown> {
	switch (name) {
		case 'cms_list_sites': {
			const [{ data: sites }, { data: posts }, { data: ideas }] = await Promise.all([
				db.from('cms_sites').select('*').order('created_at'),
				db.from('cms_posts').select('site_id, status'),
				db.from('cms_ideas').select('site_id, status'),
			]);
			return ((sites ?? []) as CmsSite[]).map((s) => ({
				slug: s.slug, name: s.name, domain: s.domain, language: s.language, active: s.active,
				mode: s.auto_publish ? 'auto-publish' : 'review (drafts)',
				posting_days: s.schedule_days, posting_hour: `${s.publish_hour}:00 ${s.timezone}`,
				has_brand_brief: Boolean(s.brand_context?.trim()), has_deploy_hook: Boolean(s.deploy_hook_url), has_api_key: Boolean(s.api_key_hash),
				posts: {
					published: (posts ?? []).filter((p) => p.site_id === s.id && p.status === 'published').length,
					scheduled: (posts ?? []).filter((p) => p.site_id === s.id && p.status === 'scheduled').length,
					draft: (posts ?? []).filter((p) => p.site_id === s.id && p.status === 'draft').length,
				},
				ideas_queued: (ideas ?? []).filter((i) => i.site_id === s.id && i.status === 'queued').length,
			}));
		}

		case 'cms_add_ideas': {
			const site = await findSite(db, args.site);
			const ideas = (args.ideas ?? []).map((i) => String(i).trim()).filter(Boolean).slice(0, 100);
			if (!ideas.length) throw new Error('ideas must contain at least one non-empty string.');
			const { error } = await db.from('cms_ideas').insert(ideas.map((idea) => ({ user_id: site.user_id, site_id: site.id, idea: idea.slice(0, 20000) })));
			if (error) throw new Error(error.message);
			return { site: site.slug, added: ideas.length };
		}

		case 'cms_list_posts': {
			const site = await findSite(db, args.site);
			let q = db.from('cms_posts').select('slug, title, status, publish_at, published_at, source').eq('site_id', site.id).order('created_at', { ascending: false }).limit(Math.min(args.limit ?? 30, 100));
			if (args.status) q = q.eq('status', args.status);
			const { data, error } = await q;
			if (error) throw new Error(error.message);
			return data;
		}

		case 'cms_get_post': {
			const site = await findSite(db, args.site);
			const p = await findPost(db, site.id, args.slug);
			const { user_id: _u, site_id: _s, idea_id: _i, ...rest } = p;
			void _u; void _s; void _i;
			return rest;
		}

		case 'cms_create_post': {
			const site = await findSite(db, args.site);
			if (!args.title?.trim() || !args.body_md?.trim()) throw new Error('title and body_md are required.');
			const { status, at } = parseWhen(args.when);
			const slug = await freeSlug(db, site.id, args.slug || args.title);
			const { data, error } = await db.from('cms_posts').insert({
				user_id: site.user_id, site_id: site.id, slug,
				title: args.title.trim(), body_md: args.body_md.trim(),
				description: args.description?.trim() || null, excerpt: args.excerpt?.trim() || null,
				keywords: (args.keywords ?? []).map((k) => k.trim()).filter(Boolean),
				cover_image_url: args.cover_image_url?.trim() || null, cover_alt: args.cover_alt?.trim() || null,
				status, publish_at: at?.toISOString() ?? null, published_at: status === 'published' ? at!.toISOString() : null,
				source: 'manual',
			}).select('slug, status, publish_at').single();
			if (error) throw new Error(error.message);
			const rebuild = status === 'published' ? await fireDeployHook(site) : null;
			return { ...data, rebuild: rebuild ? (rebuild.ok ? 'triggered' : rebuild.error) : undefined };
		}

		case 'cms_set_post_status': {
			const site = await findSite(db, args.site);
			const post = await findPost(db, site.id, args.slug);
			const now = new Date();
			const update: Record<string, unknown> = { updated_at: now.toISOString() };
			if (args.action === 'publish') {
				if (!post.body_md.trim()) throw new Error('The post has no text.');
				Object.assign(update, { status: 'published', published_at: now.toISOString(), publish_at: now.toISOString() });
			} else if (args.action === 'schedule') {
				const when = new Date(args.publish_at ?? '');
				if (Number.isNaN(when.getTime())) throw new Error('publish_at must be an ISO 8601 datetime.');
				Object.assign(update, { status: 'scheduled', publish_at: when.toISOString(), published_at: null });
			} else if (args.action === 'draft') {
				Object.assign(update, { status: 'draft', published_at: null });
			} else {
				throw new Error('action must be publish, schedule or draft.');
			}
			const { error } = await db.from('cms_posts').update(update).eq('id', post.id);
			if (error) throw new Error(error.message);
			const needsRebuild = args.action === 'publish' || (args.action === 'draft' && post.status === 'published');
			const rebuild = needsRebuild ? await fireDeployHook(site) : null;
			return { slug: post.slug, status: update.status, publish_at: update.publish_at ?? null, rebuild: rebuild ? (rebuild.ok ? 'triggered' : rebuild.error) : undefined };
		}

		case 'cms_write_next_post': {
			const site = await findSite(db, args.site);
			return runSite(site, { force: true, db });
		}

		case 'cms_rebuild_site': {
			const site = await findSite(db, args.site);
			const hook = await fireDeployHook(site);
			if (!hook.ok) throw new Error(hook.error);
			return { site: site.slug, rebuild: 'triggered' };
		}

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
}
