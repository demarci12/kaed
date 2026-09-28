import { createHash, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-only helpers for the blog CMS (/cms). Nothing here is imported by a
// client component: it touches node:crypto and the service-role key.

export type PostStatus = 'draft' | 'scheduled' | 'published';
export type IdeaStatus = 'queued' | 'generating' | 'used' | 'failed';

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
	draft: 'Draft',
	scheduled: 'Scheduled',
	published: 'Published',
};

export interface CmsSite {
	id: string;
	user_id: string;
	slug: string;
	name: string;
	domain: string | null;
	language: string;
	brand_context: string | null;
	deploy_hook_url: string | null;
	api_key_hash: string | null;
	api_key_prefix: string | null;
	active: boolean;
	auto_publish: boolean;
	/** 0 = Sunday … 6 = Saturday. */
	schedule_days: number[];
	publish_hour: number;
	timezone: string;
	buffer: number;
	created_at: string;
	updated_at: string;
}

export interface CmsPost {
	id: string;
	user_id: string;
	site_id: string;
	idea_id: string | null;
	slug: string;
	title: string;
	description: string | null;
	excerpt: string | null;
	body_md: string;
	cover_image_url: string | null;
	cover_alt: string | null;
	keywords: string[];
	status: PostStatus;
	publish_at: string | null;
	published_at: string | null;
	source: 'manual' | 'ai';
	created_at: string;
	updated_at: string;
}

export interface CmsIdea {
	id: string;
	user_id: string;
	site_id: string;
	idea: string;
	status: IdeaStatus;
	post_id: string | null;
	error: string | null;
	created_at: string;
}

/** Monday-first display order of the 0=Sun…6=Sat weekday numbers. */
export const WEEKDAYS: [number, string][] = [
	[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun'],
];

/** Service-role client: bypasses RLS, so callers must have authenticated first. */
export function serviceClient(): SupabaseClient {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error('Supabase service credentials are not configured.');
	return createClient(url, key, { auth: { persistSession: false } });
}

// ── API keys ────────────────────────────────────────────────────────────────

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** A fresh site key. Only the hash is stored, so the plaintext is shown once. */
export function newApiKey() {
	const key = `kck_${randomBytes(24).toString('base64url')}`;
	return { key, hash: hashKey(key), prefix: key.slice(0, 8) };
}

/** Resolves `Authorization: Bearer <key>` to its site, or null. */
export async function siteFromRequest(request: Request): Promise<CmsSite | null> {
	const header = request.headers.get('authorization') ?? '';
	const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
	if (!key.startsWith('kck_')) return null;
	const { data } = await serviceClient()
		.from('cms_sites')
		.select('*')
		.eq('api_key_hash', hashKey(key))
		.eq('active', true)
		.maybeSingle();
	return (data as CmsSite | null) ?? null;
}

// ── Slugs ───────────────────────────────────────────────────────────────────

/** URL slug that keeps Hungarian readable: á→a, ő→o, ű→u, and so on. */
export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/g, '') || 'post';
}

// ── Scheduling ──────────────────────────────────────────────────────────────

interface Zoned { y: number; m: number; d: number; h: number; mi: number }

function zonedParts(date: Date, tz: string): Zoned {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz, hourCycle: 'h23',
		year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
	}).formatToParts(date);
	const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
	return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), mi: get('minute') };
}

/** Wall-clock time in `tz` → the UTC instant it names (DST-safe via offset correction). */
function zonedToUtc(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
	const target = Date.UTC(y, m - 1, d, h, mi);
	let guess = target;
	for (let i = 0; i < 2; i++) {
		const p = zonedParts(new Date(guess), tz);
		guess += target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
	}
	return new Date(guess);
}

/** The first configured weekday/hour slot strictly after `after`. */
export function nextSlot(after: Date, days: number[], hour: number, tz: string): Date {
	const allowed = days.length ? days : [1, 3];
	const start = zonedParts(after, tz);
	for (let i = 0; i <= 14; i++) {
		const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i));
		if (!allowed.includes(day.getUTCDay())) continue;
		const slot = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hour, 0, tz);
		if (slot > after) return slot;
	}
	return new Date(after.getTime() + 86_400_000);
}

// ── Deploy hook ─────────────────────────────────────────────────────────────

/** Asks the site's host (a Vercel deploy hook) to rebuild so it picks up new posts. */
export async function fireDeployHook(site: Pick<CmsSite, 'deploy_hook_url'>): Promise<{ ok: boolean; error?: string }> {
	if (!site.deploy_hook_url) return { ok: false, error: 'No deploy hook set.' };
	try {
		const res = await fetch(site.deploy_hook_url, { method: 'POST' });
		return res.ok ? { ok: true } : { ok: false, error: `Deploy hook returned ${res.status}.` };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : 'Deploy hook failed.' };
	}
}

/** The public shape served to the sites. Deliberately excludes user_id and internal ids. */
export function publicPost(p: CmsPost) {
	return {
		slug: p.slug,
		title: p.title,
		description: p.description,
		excerpt: p.excerpt,
		body_md: p.body_md,
		cover_image_url: p.cover_image_url,
		cover_alt: p.cover_alt,
		keywords: p.keywords,
		published_at: p.published_at ?? p.publish_at,
		updated_at: p.updated_at,
	};
}
