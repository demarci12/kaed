import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const description = String(form.get('description') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!title) {
		return back('/goals?error=Title is required.');
	}

	const { data: maxRankRow } = await supabase
		.from('goals')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextRank = ((maxRankRow?.rank as number | undefined) ?? -1) + 1;

	const { error } = await supabase.from('goals').insert({
		user_id: user.id,
		title,
		description: description || null,
		rank: nextRank,
	});

	if (error) {
		return back(`/goals?error=${encodeURIComponent(error.message)}`);
	}

	return back('/goals');
}
