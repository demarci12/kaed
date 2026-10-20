import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/** Links a pain to a business idea. Linking twice is a no-op, not an error. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { business_idea_id?: unknown } | null;
	const ideaId = String(body?.business_idea_id ?? '').trim();
	if (!ideaId) return NextResponse.json({ ok: false, error: 'Pick a business idea.' }, { status: 400 });

	const { error } = await supabase
		.from('pain_point_ideas')
		.upsert(
			{ pain_point_id: id, business_idea_id: ideaId, user_id: user.id },
			{ onConflict: 'pain_point_id,business_idea_id', ignoreDuplicates: true },
		);
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

	return NextResponse.json({ ok: true });
}
