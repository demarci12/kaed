import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
	const session = await getOwnerSession();
	if (!session) {
		return wantsJson
			? NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 })
			: NextResponse.redirect(new URL('/login', request.url), { status: 303 });
	}

	const { id } = await params;
	const { error } = await session.supabase.from('business_ideas').delete().eq('id', id);

	if (error) {
		return wantsJson
			? NextResponse.json({ ok: false, error: error.message }, { status: 500 })
			: NextResponse.redirect(
					new URL(`/business-ideas/${id}?error=${encodeURIComponent(error.message)}`, request.url),
					{ status: 303 },
				);
	}

	return wantsJson
		? NextResponse.json({ ok: true }, { status: 200 })
		: NextResponse.redirect(new URL('/business-ideas', request.url), { status: 303 });
}
