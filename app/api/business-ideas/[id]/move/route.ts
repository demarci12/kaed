import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
	const { supabase } = session;
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { direction?: unknown } | null;
	const direction = body?.direction;

	if (direction !== 'up' && direction !== 'down') {
		return NextResponse.json({ error: 'Invalid move.' }, { status: 400 });
	}

	const { data: current } = await supabase
		.from('business_ideas')
		.select('id, rank')
		.eq('id', id)
		.maybeSingle();

	if (!current) {
		return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
	}

	let neighborQuery = supabase
		.from('business_ideas')
		.select('id, rank')
		.order('rank', { ascending: direction === 'down' })
		.limit(1);

	neighborQuery = direction === 'up' ? neighborQuery.lt('rank', current.rank) : neighborQuery.gt('rank', current.rank);

	const { data: neighbor } = await neighborQuery.maybeSingle();

	if (!neighbor) {
		return NextResponse.json({ ok: true, moved: false }, { status: 200 });
	}

	const [{ error: err1 }, { error: err2 }] = await Promise.all([
		supabase.from('business_ideas').update({ rank: neighbor.rank }).eq('id', current.id),
		supabase.from('business_ideas').update({ rank: current.rank }).eq('id', neighbor.id),
	]);

	if (err1 || err2) {
		return NextResponse.json({ error: (err1 || err2)!.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, moved: true, swappedWithId: neighbor.id }, { status: 200 });
}
