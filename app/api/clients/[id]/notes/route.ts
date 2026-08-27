import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	const { supabase, user } = session;

	const { id: clientId } = await params;
	const form = await request.formData();
	const note = String(form.get('note') ?? '').trim();

	const back = (path: string) => NextResponse.redirect(new URL(path, request.url), { status: 303 });

	if (!note) {
		return back(`/clients/${clientId}?error=Note text is required.`);
	}

	const { error } = await supabase.from('client_notes').insert({
		client_id: clientId,
		user_id: user.id,
		note,
	});

	if (error) {
		return back(`/clients/${clientId}?error=${encodeURIComponent(error.message)}`);
	}

	return back(`/clients/${clientId}`);
}
