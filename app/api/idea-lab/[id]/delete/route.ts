import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id } = await params;

	const { error } = await session.supabase.from('idea_candidates').delete().eq('id', id);
	const query = error ? `?error=${encodeURIComponent(error.message)}` : '';
	return NextResponse.redirect(new URL(`/idea-lab${query}#step-6`, request.url), { status: 303 });
}
