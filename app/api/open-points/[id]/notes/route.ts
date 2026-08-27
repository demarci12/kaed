import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const form = await request.formData();
	const note = String(form.get('note') ?? '').trim();

	if (note) {
		const { error } = await supabase.from('open_point_notes').insert({ open_point_id: id, user_id: user.id, note });
		if (error) {
			return NextResponse.redirect(new URL(`/opl/${id}?error=${encodeURIComponent(error.message)}`, request.url), {
				status: 303,
			});
		}
	}

	const back = request.headers.get('referer');
	return NextResponse.redirect(back || new URL(`/opl/${id}`, request.url), { status: 303 });
}
