import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	if (!title) {
		return NextResponse.redirect(new URL('/think-pad?error=Title is required.', request.url), { status: 303 });
	}

	const { data, error } = await supabase
		.from('think_pad_pages')
		.insert({ user_id: user.id, title })
		.select('id')
		.single();

	if (error) {
		return NextResponse.redirect(
			new URL(`/think-pad?error=${encodeURIComponent(error.message)}`, request.url),
			{ status: 303 },
		);
	}

	return NextResponse.redirect(new URL(`/think-pad/${data.id}`, request.url), { status: 303 });
}
