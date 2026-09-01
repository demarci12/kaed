import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { parseDomainPain, summarizeDomainPain, type IdeaCandidate } from '@/lib/idea-lab';

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

	// personal_pain holds a { domain: painNotes } map, not prose -- see
	// DomainPainEditor.tsx / parseDomainPain in lib/idea-lab.ts. Render it
	// back to readable text here so the converted idea's pain_point reads
	// normally instead of showing a JSON blob.
	const painPoint = summarizeDomainPain(parseDomainPain(typed.personal_pain));

	const { data: created, error } = await supabase
		.from('business_ideas')
		.insert({
			user_id: user.id,
			title: typed.title,
			pain_point: painPoint || null,
			target_market: typed.buyer || null,
			validation: typed.validation || null,
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
