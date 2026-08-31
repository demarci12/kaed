import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { summarizeStudy, type Study } from '@/lib/studies';

export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	const { data: study } = await supabase.from('studies').select('*').eq('id', id).maybeSingle();
	if (!study) return back('/studies?error=Study not found.');
	const typed = study as Study;

	try {
		const result = await summarizeStudy(typed.url);
		// A retry replaces the takeaway set rather than appending to it --
		// otherwise a flaky first attempt leaves stale/partial rows sitting
		// next to the good ones from the retry.
		await supabase.from('study_takeaways').delete().eq('study_id', id);
		await supabase
			.from('studies')
			.update({ title: result.title, status: 'summarized', fetched_at: new Date().toISOString(), error: null })
			.eq('id', id);
		await supabase.from('study_takeaways').insert(
			result.takeaways.map((t) => ({ study_id: id, user_id: user.id, category: t.category, takeaway: t.takeaway })),
		);
	} catch (summarizeError) {
		await supabase
			.from('studies')
			.update({ status: 'failed', error: summarizeError instanceof Error ? summarizeError.message : 'Summarization failed.' })
			.eq('id', id);
	}

	return back(`/studies/${id}`);
}
