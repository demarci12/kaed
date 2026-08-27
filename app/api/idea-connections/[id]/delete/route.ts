import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

	const { id } = await params;
	const { error } = await session.supabase.from('idea_connections').delete().eq('id', id);

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ ok: true }, { status: 200 });
}
