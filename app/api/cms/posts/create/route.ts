import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { slugify } from '@/lib/cms';

/** Creates an empty manual draft and opens it in the editor. */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const siteId = String(form.get('site_id') ?? '');
	const title = String(form.get('title') ?? '').trim() || 'Untitled post';
	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	const base = slugify(title);
	const { data: existing } = await supabase.from('cms_posts').select('slug').eq('site_id', siteId).like('slug', `${base}%`);
	const taken = new Set((existing ?? []).map((r) => r.slug as string));
	let slug = base;
	for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

	const { data, error } = await supabase
		.from('cms_posts')
		.insert({ user_id: user.id, site_id: siteId, title, slug, source: 'manual' })
		.select('id')
		.single();
	if (error) return back(`/cms/${siteId}?error=${encodeURIComponent(error.message)}`);
	return back(`/cms/${siteId}/posts/${data.id}`);
}
