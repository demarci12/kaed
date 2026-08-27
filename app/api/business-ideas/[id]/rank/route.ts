import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
	const { supabase } = session;
	const { id } = await params;

	const body = (await request.json().catch(() => null)) as { position?: unknown } | null;
	const position = Number(body?.position);

	if (!Number.isFinite(position) || position < 1) {
		return NextResponse.json({ error: 'Invalid position.' }, { status: 400 });
	}

	const { data: ideas, error: fetchError } = await supabase
		.from('business_ideas')
		.select('id')
		.order('rank', { ascending: true });

	if (fetchError) {
		return NextResponse.json({ error: fetchError.message }, { status: 500 });
	}

	const order = ((ideas ?? []) as { id: string }[]).map((idea) => idea.id);
	const currentIndex = order.indexOf(id);
	if (currentIndex === -1) {
		return NextResponse.json({ error: 'Idea not found.' }, { status: 404 });
	}

	const targetIndex = Math.min(Math.max(Math.round(position) - 1, 0), order.length - 1);
	if (targetIndex === currentIndex) {
		return NextResponse.json({ ok: true, order }, { status: 200 });
	}

	order.splice(currentIndex, 1);
	order.splice(targetIndex, 0, id);

	const updates = order
		.map((ideaId, index) => ({ ideaId, rank: index }))
		.filter((_, index) => index >= Math.min(currentIndex, targetIndex) && index <= Math.max(currentIndex, targetIndex));

	const { error: updateError } = (
		await Promise.all(updates.map(({ ideaId, rank }) => supabase.from('business_ideas').update({ rank }).eq('id', ideaId)))
	).find((result) => result.error) ?? {};

	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true, order }, { status: 200 });
}
