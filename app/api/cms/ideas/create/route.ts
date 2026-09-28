import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/** Adds ideas to a site's queue: one idea per non-empty line of the submitted text. */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const siteId = String(form.get('site_id') ?? '');
	const lines = String(form.get('ideas') ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 100);
	const back = (query = '') => NextResponse.redirect(new URL(`/cms/${siteId}${query}#ideas`, request.url), { status: 303 });

	if (!lines.length) return back('?error=Write at least one idea.');

	const { error } = await supabase
		.from('cms_ideas')
		.insert(lines.map((idea) => ({ user_id: user.id, site_id: siteId, idea: idea.slice(0, 20000) })));
	if (error) return back(`?error=${encodeURIComponent(error.message)}`);
	return back();
}
