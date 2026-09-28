import { NextResponse } from 'next/server';
import { publicPost, serviceClient, siteFromRequest, type CmsPost } from '@/lib/cms';

export const dynamic = 'force-dynamic';

/** `GET /api/cms/v1/posts/<slug>` — one published post for the calling site. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
	const site = await siteFromRequest(request);
	if (!site) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

	const { slug } = await params;
	const { data } = await serviceClient()
		.from('cms_posts')
		.select('*')
		.eq('site_id', site.id)
		.eq('slug', slug)
		.eq('status', 'published')
		.maybeSingle();
	if (!data) return NextResponse.json({ error: 'Post not found.' }, { status: 404 });

	return NextResponse.json({ post: publicPost(data as CmsPost) }, { headers: { 'Cache-Control': 'no-store' } });
}
