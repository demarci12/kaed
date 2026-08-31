import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { IDEA_LAB_STEPS, summarizeStepAnswer, type IdeaCandidate } from '@/lib/idea-lab';

const PERSONAL_PAIN_STEP = IDEA_LAB_STEPS.find((s) => s.field === 'personal_pain')!;
const BUYER_STEP = IDEA_LAB_STEPS.find((s) => s.field === 'buyer')!;
const VALIDATION_STEP = IDEA_LAB_STEPS.find((s) => s.field === 'validation')!;

/**
 * Turns a candidate into a real row in the business idea register. The
 * candidate isn't deleted -- business_idea_id links forward to the new row,
 * so the process trail (why this idea was picked) survives the conversion
 * instead of being thrown away at the exact moment it mattered most.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	const { data: candidate } = await supabase.from('idea_candidates').select('*').eq('id', id).maybeSingle();
	if (!candidate) return back('/idea-lab?error=Idea not found.');
	const typed = candidate as IdeaCandidate;

	if (typed.business_idea_id) {
		return back(`/business-ideas/${typed.business_idea_id}`);
	}

	const { data: maxRankRow } = await supabase
		.from('business_ideas')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextRank = ((maxRankRow?.rank as number | undefined) ?? -1) + 1;

	// Step answers are stored as JSON (see parseStepAnswer/composeStepAnswer in
	// lib/idea-lab.ts) -- summarizeStepAnswer turns that back into the
	// readable prose these business_ideas columns expect, instead of the raw
	// JSON blob landing in a field a human is meant to read.
	const painPoint = summarizeStepAnswer(PERSONAL_PAIN_STEP, typed.personal_pain);
	const targetMarket = summarizeStepAnswer(BUYER_STEP, typed.buyer);
	const validation = summarizeStepAnswer(VALIDATION_STEP, typed.validation);

	const { data: created, error } = await supabase
		.from('business_ideas')
		.insert({
			user_id: user.id,
			title: typed.title,
			pain_point: painPoint || null,
			target_market: targetMarket || null,
			validation: validation || null,
			rank: nextRank,
		})
		.select('id')
		.single();

	if (error || !created) {
		return back(`/idea-lab/${id}?error=${encodeURIComponent(error?.message ?? 'Could not create the business idea.')}`);
	}

	await supabase
		.from('idea_candidates')
		.update({ business_idea_id: created.id, decision: 'go' })
		.eq('id', id);

	return back(`/business-ideas/${created.id}`);
}
