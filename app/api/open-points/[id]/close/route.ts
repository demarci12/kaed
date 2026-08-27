import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/**
 * One-click "Done" from the list, instead of opening the status dropdown to
 * pick "Closed". A no-op (200, no new event) if it's already closed, so a
 * double-click or a stale page can't write a duplicate status event.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const { data: current } = await supabase.from('open_points').select('status').eq('id', id).maybeSingle();
	if (!current) {
		return NextResponse.redirect(new URL('/opl?error=Item not found.', request.url), { status: 303 });
	}

	if (current.status !== 'closed') {
		const { error } = await supabase.from('open_points').update({ status: 'closed' }).eq('id', id);
		if (error) {
			return NextResponse.redirect(new URL(`/opl?error=${encodeURIComponent(error.message)}`, request.url), {
				status: 303,
			});
		}
		await supabase.from('open_point_status_events').insert({ open_point_id: id, user_id: user.id, status: 'closed' });
	}

	const back = request.headers.get('referer');
	return NextResponse.redirect(back && back.includes(`/opl`) ? back : new URL('/opl', request.url), { status: 303 });
}
