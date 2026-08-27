import { NextResponse } from 'next/server';
import { getOwnerSession } from '@/lib/auth';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const session = await getOwnerSession();
	if (!session) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

	const { id } = await params;
	const { error } = await session.supabase.from('open_points').delete().eq('id', id);

	if (error) {
		return NextResponse.redirect(new URL(`/opl?error=${encodeURIComponent(error.message)}`, request.url), {
			status: 303,
		});
	}

	return NextResponse.redirect(new URL('/opl', request.url), { status: 303 });
}
