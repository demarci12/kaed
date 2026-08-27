import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

	const { id } = await params;
	const { error } = await session.supabase.from('knowledge_cards').delete().eq('id', id);

	if (error) {
		return NextResponse.redirect(
			new URL(`/specific-knowledge?error=${encodeURIComponent(error.message)}`, request.url),
			{ status: 303 },
		);
	}

	return NextResponse.redirect(new URL('/specific-knowledge', request.url), { status: 303 });
}
