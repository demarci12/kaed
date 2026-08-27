import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
	const { supabase } = session;

	const body = (await request.json().catch(() => null)) as { order?: unknown } | null;
	const order = Array.isArray(body?.order)
		? (body.order.filter((id: unknown) => typeof id === 'string') as string[])
		: null;

	if (!order || !order.length) {
		return NextResponse.json({ error: 'Invalid order.' }, { status: 400 });
	}

	const results = await Promise.all(
		order.map((id: string, index: number) => supabase.from('goals').update({ rank: index }).eq('id', id)),
	);
	const failed = results.find((result) => result.error);

	if (failed?.error) {
		return NextResponse.json({ error: failed.error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true }, { status: 200 });
}
