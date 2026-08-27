import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase } = session;

	const { id } = await params;
	const form = await request.formData();
	const title = String(form.get('title') ?? '').trim();
	const painPoint = String(form.get('pain_point') ?? '').trim();
	const targetMarket = String(form.get('target_market') ?? '').trim();
	const validation = String(form.get('validation') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!title) {
		return back(`/business-ideas/${id}?error=Title is required.`);
	}

	const { error } = await supabase
		.from('business_ideas')
		.update({
			title,
			pain_point: painPoint || null,
			target_market: targetMarket || null,
			validation: validation || null,
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) {
		return back(`/business-ideas/${id}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/business-ideas/${id}`);
}
