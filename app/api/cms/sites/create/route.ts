import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { slugify } from '@/lib/cms';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const name = String(form.get('name') ?? '').trim();
	const domain = String(form.get('domain') ?? '').trim();
	const language = String(form.get('language') ?? 'hu').trim() || 'hu';
	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!name) return back('/cms?error=Name is required.');

	const { data, error } = await supabase
		.from('cms_sites')
		.insert({ user_id: user.id, name, slug: slugify(domain || name), domain: domain || null, language })
		.select('id')
		.single();
	if (error) return back(`/cms?error=${encodeURIComponent(error.message)}`);
	return back(`/cms/${data.id}`);
}
