import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();

	if (!title) {
		return NextResponse.redirect(new URL('/idea-lab?error=Title is required.', request.url), { status: 303 });
	}

	const { data: last } = await supabase
		.from('idea_candidates')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();

	const { error } = await supabase.from('idea_candidates').insert({
		user_id: user.id,
		title,
		rank: (last?.rank ?? -1) + 1,
	});

	if (error) {
		return NextResponse.redirect(new URL(`/idea-lab?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}
	return NextResponse.redirect(new URL('/idea-lab', request.url), { status: 303 });
}
