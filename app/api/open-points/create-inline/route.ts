import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

/**
 * Creates an empty open point and redirects back to the list, which the
 * server then re-renders with the new row already in it.
 *
 * This is deliberately a redirect rather than a JSON response: the page used
 * to POST here from JS and then hand-build the new note with innerHTML,
 * which broke twice over -- the scoped styles never applied to the injected
 * markup (unstyled notes), and the click handler went stale after the first
 * soft navigation (button did nothing). Letting the server render the list is
 * the only version where both are impossible.
 */
export async function POST(request: Request) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const { error } = await supabase.from('open_points').insert({ user_id: user.id, title: '' });

	if (error) {
		return NextResponse.redirect(new URL(`/opl?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}

	return NextResponse.redirect(new URL('/opl', request.url), { status: 303 });
}
