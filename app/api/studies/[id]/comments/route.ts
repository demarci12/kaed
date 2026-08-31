import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;
	const { id } = await params;

	const form = await request.formData();
	const comment = String(form.get('comment') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (comment) {
		const { error } = await supabase.from('study_comments').insert({ study_id: id, user_id: user.id, comment });
		if (error) return back(`/studies/${id}?error=${encodeURIComponent(error.message)}`);
	}
	return back(`/studies/${id}`);
}
