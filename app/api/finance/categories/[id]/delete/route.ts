import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

	const { id } = await params;
	const { error } = await session.supabase.from('finance_categories').delete().eq('id', id);

	if (error) {
		return NextResponse.redirect(
			new URL(`/finance/settings?error=${encodeURIComponent(error.message)}`, request.url),
			{ status: 303 },
		);
	}

	return NextResponse.redirect(new URL('/finance/settings', request.url), { status: 303 });
}
