import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/**
 * Turns a pain into a business idea and links the two, then lands on the new
 * idea. The pain's own text seeds the idea's pain point / target market; the
 * rest (validation, category) is for the idea page.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

	const session = await getOwnerSession();
	if (!session) {
		return wantsJson
			? NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 })
			: NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	}
	const { supabase, user } = session;
	const { id } = await params;

	// Plain form: redirect. Async caller: the same destination as JSON, to navigate to without a reload.
	const back = (path: string) =>
		wantsJson ? NextResponse.json({ ok: true, redirectTo: path }) : NextResponse.redirect(new URL(path, request.url), { status: 303 });
	const fail = (message: string) =>
		wantsJson
			? NextResponse.json({ ok: false, error: message }, { status: 400 })
			: back(`/painhunter?error=${encodeURIComponent(message)}`);

	const { data: pain } = await supabase
		.from('pain_points')
		.select('title, details, who')
		.eq('id', id)
		.maybeSingle();
	if (!pain) return fail('Pain not found.');

	const { data: maxRankRow } = await supabase
		.from('business_ideas')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextRank = ((maxRankRow?.rank as number | undefined) ?? -1) + 1;

	const { data: idea, error } = await supabase
		.from('business_ideas')
		.insert({
			user_id: user.id,
			title: pain.title,
			pain_point: [pain.title, pain.details].filter(Boolean).join('\n\n'),
			target_market: pain.who || null,
			rank: nextRank,
		})
		.select('id')
		.single();
	if (error || !idea) return fail(error?.message ?? 'Could not create the idea.');

	const { error: linkError } = await supabase
		.from('pain_point_ideas')
		.insert({ pain_point_id: id, business_idea_id: idea.id, user_id: user.id });
	if (linkError) return back(`/business-ideas/${idea.id}?error=${encodeURIComponent(`Idea created, but linking failed: ${linkError.message}`)}`);

	return back(`/business-ideas/${idea.id}`);
}
