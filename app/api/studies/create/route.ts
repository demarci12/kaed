import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { summarizeStudy, type StudySourceType } from '@/lib/studies';

// Fetch + Claude call can run well past Vercel's default function duration
// on a slow source page; this raises the ceiling for this one route instead
// of the whole app.
export const maxDuration = 60;

const SOURCE_TYPES = new Set(['blog', 'youtube', 'x', 'website']);

/**
 * Inserts the row first (status='pending') so it shows up immediately, then
 * summarizes inline before redirecting -- there's no background job queue in
 * this app, so this request just takes as long as the fetch+Claude call
 * takes. If that's ever too slow, the row is already visible as 'pending'
 * and /retry re-runs the same summarization without losing it.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const url = String(form.get('url') ?? '').trim();
	const sourceTypeRaw = String(form.get('source_type') ?? 'blog').trim();
	const sourceType = (SOURCE_TYPES.has(sourceTypeRaw) ? sourceTypeRaw : 'blog') as StudySourceType;

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!url) return back('/studies?error=URL is required.');
	try {
		new URL(url);
	} catch {
		return back('/studies?error=That does not look like a valid URL.');
	}

	const { data: created, error: insertError } = await supabase
		.from('studies')
		.insert({ user_id: user.id, url, source_type: sourceType })
		.select('id')
		.single();

	if (insertError || !created) {
		return back(`/studies?error=${encodeURIComponent(insertError?.message ?? 'Could not save the URL.')}`);
	}

	try {
		const result = await summarizeStudy(url);
		await supabase
			.from('studies')
			.update({ title: result.title, status: 'summarized', fetched_at: new Date().toISOString(), error: null })
			.eq('id', created.id);
		await supabase.from('study_takeaways').insert(
			result.takeaways.map((t) => ({ study_id: created.id, user_id: user.id, category: t.category, takeaway: t.takeaway })),
		);
	} catch (summarizeError) {
		await supabase
			.from('studies')
			.update({ status: 'failed', error: summarizeError instanceof Error ? summarizeError.message : 'Summarization failed.' })
			.eq('id', created.id);
	}

	return back(`/studies/${created.id}`);
}
