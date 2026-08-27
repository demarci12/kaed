import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const painPoint = String(form.get('pain_point') ?? '').trim();
	const targetMarket = String(form.get('target_market') ?? '').trim();
	const validation = String(form.get('validation') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!title) {
		return back('/business-ideas?error=Title is required.');
	}

	const { data: maxRankRow } = await supabase
		.from('business_ideas')
		.select('rank')
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextRank = ((maxRankRow?.rank as number | undefined) ?? -1) + 1;

	const { error } = await supabase.from('business_ideas').insert({
		user_id: user.id,
		title,
		pain_point: painPoint || null,
		target_market: targetMarket || null,
		validation: validation || null,
		rank: nextRank,
	});

	if (error) {
		return back(`/business-ideas?error=${encodeURIComponent(error.message)}`);
	}

	return back('/business-ideas');
}
