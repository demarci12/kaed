import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import type { IdeaCandidate, IdeaLabWorksheet } from '@/lib/idea-lab';

/**
 * Promotes an idea that surfaced in the lab into the business idea register.
 * The pain point / buyer / validation come from the *worksheet*, not the
 * candidate row -- that research was done once for the whole search, so every
 * idea it produced inherits it rather than each carrying its own copy.
 *
 * The candidate isn't deleted: business_idea_id links forward, so the trail
 * from process to idea survives the conversion instead of being thrown away
 * at the exact moment it mattered most.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });
	const lab = (query: string) => back(`/idea-lab?error=${encodeURIComponent(query)}#step-6`);

	const { data: candidate } = await supabase.from('idea_candidates').select('*').eq('id', id).maybeSingle();
	if (!candidate) return lab('Idea not found.');
	const typed = candidate as IdeaCandidate;

	if (typed.business_idea_id) return back(`/business-ideas/${typed.business_idea_id}`);

	const [{ data: worksheet }, { data: maxRankRow }] = await Promise.all([
		supabase.from('idea_lab').select('*').eq('id', typed.idea_lab_id).maybeSingle(),
		supabase.from('business_ideas').select('rank').order('rank', { ascending: false }).limit(1).maybeSingle(),
	]);
	const sheet = worksheet as IdeaLabWorksheet | null;

	const { data: created, error } = await supabase
		.from('business_ideas')
		.insert({
			user_id: user.id,
			title: typed.title,
			pain_point: typed.note || sheet?.personal_pain || null,
			target_market: sheet?.buyer || null,
			validation: sheet?.validation || null,
			rank: ((maxRankRow?.rank as number | undefined) ?? -1) + 1,
		})
		.select('id')
		.single();

	if (error || !created) return lab(error?.message ?? 'Could not create the business idea.');

	await supabase
		.from('idea_candidates')
		.update({ business_idea_id: created.id, decision: 'go' })
		.eq('id', id);

	return back(`/business-ideas/${created.id}`);
}
