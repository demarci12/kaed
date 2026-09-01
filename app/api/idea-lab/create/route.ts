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

	const { data: created, error } = await supabase
		.from('idea_candidates')
		.insert({
			user_id: user.id,
			title,
			rank: (last?.rank ?? -1) + 1,
		})
		.select('id')
		.single();

	if (error || !created) {
		return NextResponse.redirect(
			new URL(`/idea-lab?error=${encodeURIComponent(error?.message ?? 'Could not create the idea.')}`, request.url),
			{ status: 303 },
		);
	}

	// Idea Lab is the brainstorming workspace for one idea, not a form that
	// files itself away -- creating one should drop you straight into it, not
	// back onto the list you just left.
	return NextResponse.redirect(new URL(`/idea-lab/${created.id}`, request.url), { status: 303 });
}
