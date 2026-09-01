import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';
import { getOrCreateWorksheet } from '@/lib/idea-lab-worksheet';

/** Logs one Step 3 market-demand finding against the worksheet. */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const back = (query = '') =>
		NextResponse.redirect(new URL(`/idea-lab${query}#step-3`, request.url), { status: 303 });

	const form = await request.formData();
	const problem = String(form.get('problem') ?? '').trim();
	if (!problem) return back('?error=Problem is required.');

	const worksheet = await getOrCreateWorksheet(supabase, user.id);
	if (!worksheet) return back('?error=Could not open your worksheet.');

	const text = (key: string) => String(form.get(key) ?? '').trim() || null;

	const { error } = await supabase.from('idea_lab_evidence').insert({
		idea_lab_id: worksheet.id,
		user_id: user.id,
		problem,
		source: text('source'),
		permalink: text('permalink'),
		engagement: text('engagement'),
		quote: text('quote'),
		found_on: text('found_on'),
	});

	if (error) return back(`?error=${encodeURIComponent(error.message)}`);
	return back();
}
