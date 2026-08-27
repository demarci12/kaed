import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/** Hides an item from /opl without deleting it -- notes and status history stay intact. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { id } = await params;

	const { error } = await session.supabase
		.from('open_points')
		.update({ archived_at: new Date().toISOString() })
		.eq('id', id);

	if (error) {
		return NextResponse.redirect(new URL(`/opl?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}

	const back = request.headers.get('referer');
	return NextResponse.redirect(back && !back.includes(`/opl/${id}`) ? back : new URL('/opl', request.url), {
		status: 303,
	});
}
