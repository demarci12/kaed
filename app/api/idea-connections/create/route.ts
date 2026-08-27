import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
	const { supabase, user } = session;

	const body = (await request.json().catch(() => null)) as { from_idea_id?: unknown; to_idea_id?: unknown } | null;
	const fromIdeaId = String(body?.from_idea_id ?? '').trim();
	const toIdeaId = String(body?.to_idea_id ?? '').trim();

	if (!fromIdeaId || !toIdeaId || fromIdeaId === toIdeaId) {
		return NextResponse.json({ error: 'Invalid connection.' }, { status: 400 });
	}

	const { data: existing } = await supabase
		.from('idea_connections')
		.select('id')
		.or(
			`and(from_idea_id.eq.${fromIdeaId},to_idea_id.eq.${toIdeaId}),and(from_idea_id.eq.${toIdeaId},to_idea_id.eq.${fromIdeaId})`,
		)
		.maybeSingle();

	if (existing) {
		return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
	}

	const { data, error } = await supabase
		.from('idea_connections')
		.insert({ user_id: user.id, from_idea_id: fromIdeaId, to_idea_id: toIdeaId })
		.select('id')
		.single();

	if (error) {
		// Unique violation means this connection already exists — not an error from the UI's perspective.
		if (error.code === '23505') {
			return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
		}
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, id: data.id }, { status: 200 });
}
