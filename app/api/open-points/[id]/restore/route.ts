import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/** Brings an archived item back onto /opl. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id } = await params;

	const { error } = await session.supabase.from('open_points').update({ archived_at: null }).eq('id', id);

	if (error) {
		return NextResponse.redirect(new URL(`/opl/archive?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}

	const back = request.headers.get('referer');
	return NextResponse.redirect(back || new URL('/opl/archive', request.url), { status: 303 });
}
