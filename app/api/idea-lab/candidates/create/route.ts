import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';

/**
 * Adds an idea that surfaced at Step 6. Redirects straight back to the
 * anchor, not to a detail page -- the whole point of the rebuild is that you
 * never leave the worksheet to record what it produced.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const back = (query = '') =>
		NextResponse.redirect(new URL(`/idea-lab${query}#step-6`, request.url), { status: 303 });

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	if (!title) return back('?error=Title is required.');

	const worksheet = await getOrCreateWorksheet(supabase, user.id);
	if (!worksheet) return back('?error=Could not open your worksheet.');

	const { data: last } = await supabase
		.from('idea_candidates')
		.select('rank')
		.eq('idea_lab_id', worksheet.id)
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();

	const { error } = await supabase.from('idea_candidates').insert({
		user_id: user.id,
		idea_lab_id: worksheet.id,
		title,
		rank: ((last?.rank as number | undefined) ?? -1) + 1,
	});

	if (error) return back(`?error=${encodeURIComponent(error.message)}`);
	return back();
}
