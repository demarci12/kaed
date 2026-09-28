import { NextResponse } from 'next/server';
import { publicPost, serviceClient, siteFromRequest, type CmsPost } from '@/lib/cms';

export const dynamic = 'force-dynamic';

/**
 * Public read API for a site's build: `GET /api/cms/v1/posts` with
 * `Authorization: Bearer <site key>`. Returns published posts, newest first.
 * `?limit=` caps the count (default/max 200); `?since=<ISO>` returns only posts
 * touched after that instant.
 */
export async function GET(request: Request) {
	const site = await siteFromRequest(request);
	if (!site) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

	const url = new URL(request.url);
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 200, 1), 200);
	const since = url.searchParams.get('since');

	let query = serviceClient()
		.from('cms_posts')
		.select('*')
		.eq('site_id', site.id)
		.eq('status', 'published')
		.order('published_at', { ascending: false })
		.limit(limit);
	if (since && !Number.isNaN(Date.parse(since))) query = query.gt('updated_at', since);

	const { data, error } = await query;
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });

	return NextResponse.json(
		{ site: { slug: site.slug, name: site.name, domain: site.domain }, posts: ((data ?? []) as CmsPost[]).map(publicPost) },
		{ headers: { 'Cache-Control': 'no-store' } },
	);
}
