import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { business_idea_id?: unknown } | null;
	const ideaId = String(body?.business_idea_id ?? '').trim();
	if (!ideaId) return NextResponse.json({ ok: false, error: 'Pick a business idea.' }, { status: 400 });

	const { error } = await session.supabase
		.from('pain_point_ideas')
		.delete()
		.eq('pain_point_id', id)
		.eq('business_idea_id', ideaId);
	if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

	return NextResponse.json({ ok: true });
}
