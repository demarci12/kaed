import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const form = await request.formData();
	const problem = String(form.get('problem') ?? '').trim();
	const source = String(form.get('source') ?? '').trim();
	const permalink = String(form.get('permalink') ?? '').trim();
	const engagement = String(form.get('engagement') ?? '').trim();
	const quote = String(form.get('quote') ?? '').trim();
	const foundOn = String(form.get('found_on') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!problem) {
		return back(`/idea-lab/${id}?error=Problem is required.`);
	}

	const { error } = await supabase.from('idea_lab_evidence').insert({
		idea_candidate_id: id,
		user_id: user.id,
		problem,
		source: source || null,
		permalink: permalink || null,
		engagement: engagement || null,
		quote: quote || null,
		found_on: foundOn || null,
	});

	if (error) {
		return back(`/idea-lab/${id}?error=${encodeURIComponent(error.message)}`);
	}
	return back(`/idea-lab/${id}`);
}
