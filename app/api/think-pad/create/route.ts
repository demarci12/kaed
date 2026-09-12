import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const body = String(form.get('body') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!body) {
		return back('/think-pad?error=Write something first.');
	}

	const { error } = await supabase.from('think_pad_entries').insert({
		user_id: user.id,
		title: title || null,
		body,
		source: 'app',
	});

	if (error) {
		return back(`/think-pad?error=${encodeURIComponent(error.message)}`);
	}

	return back('/think-pad');
}
